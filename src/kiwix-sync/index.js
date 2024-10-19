import axios from "axios";
import fsPromises from "fs/promises";
import { spawnSync, spawn } from "child_process";
import { setTimeout } from "timers/promises";
import cheerio from "cheerio";

const CFG_URL = process.env.CFG_URL;
const CFG_FILE = process.env.CFG_FILE;
const CFG_ORDER = process.env.CFG_ORDER || "desc";
const CFG_EXPIRES = parseInt(process.env.CFG_EXPIRES, 10) || 12 * 30 * 24;
const CFG_OUTPUT = process.env.CFG_OUTPUT || "/out/wiki.zim";
const CFG_TIME_FILE = process.env.CFG_TIME_FILE;
const CFG_NAME_FILE = process.env.CFG_NAME_FILE;
const CFG_CONTAINER = process.env.CFG_CONTAINER;

if (!CFG_URL || !CFG_FILE) {
  console.error("CFG_URL and CFG_FILE environment variables must be set.");
  process.exit(1);
}

async function main() {
  while (true) {
    try {
      const needsDownload = await checkIfDownloadNeeded();
      if (needsDownload) {
        const fileUrl = await selectFileToDownload();
        await downloadFile(fileUrl);
        if (CFG_TIME_FILE) {
          await updateTimeFile();
        }
        if (CFG_CONTAINER) {
          restartDockerContainer();
        }
      } else {
        console.log("No action needed.");
      }
    } catch (error) {
      console.error("An error occurred:", error);
    }
    console.log("Sleeping for an hour.");
    await setTimeout(3600_000); // Sleep for an hour
  }
}

async function checkIfDownloadNeeded() {
  try {
    const outputExists = await fileExists(CFG_OUTPUT);
    if (!outputExists) {
      console.log("Output file does not exist. Need to download.");
      return true;
    }
    let lastUpdateTime;
    if (CFG_TIME_FILE) {
      const timeFileExists = await fileExists(CFG_TIME_FILE);
      if (timeFileExists) {
        const timeContent = await fsPromises.readFile(CFG_TIME_FILE, "utf8");
        lastUpdateTime = new Date(parseInt(timeContent, 10));
      } else {
        // Time file does not exist but output file exists
        lastUpdateTime = new Date();
        await fsPromises.writeFile(
          CFG_TIME_FILE,
          lastUpdateTime.getTime().toString(),
          "utf8",
        );
        console.warn("Time file did not exist. Created new time file.");
      }
    } else {
      // Use metadata of the output file
      const stats = await fsPromises.stat(CFG_OUTPUT);
      lastUpdateTime = stats.mtime;
    }
    const now = new Date();
    const hoursDiff = (now - lastUpdateTime) / (1000 * 60 * 60);
    console.log("Hours since last update:", Math.round(hoursDiff * 100) / 100);
    if (hoursDiff >= CFG_EXPIRES) {
      console.log("File has expired. Need to download.");
      return true;
    } else {
      console.log("File has not expired. No need to download.");
      return false;
    }
  } catch (error) {
    console.error("Error in checkIfDownloadNeeded:", error);
    return true; // Default to needing download if error occurs
  }
}

// Helper function to check if a file exists
async function fileExists(path) {
  try {
    await fsPromises.access(path);
    return true;
  } catch {
    return false;
  }
}

async function selectFileToDownload() {
  try {
    const response = await axios.get(CFG_URL);
    const html = response.data;

    const $ = cheerio.load(html);
    const links = [];
    const fileRegex = new RegExp(CFG_FILE);

    $("a").each((i, element) => {
      const href = $(element).attr("href");
      if (href && fileRegex.test(href)) {
        links.push(href);
      }
    });

    if (links.length === 0) {
      throw new Error("No matching files found.");
    }

    // Sort the links
    links.sort();
    if (CFG_ORDER.toLowerCase() === "desc") {
      links.reverse();
    }

    // Select the first file
    const selectedFile = links[0];
    const fileUrl = new URL(selectedFile, CFG_URL).href;
    console.log("Selected file to download:", fileUrl);
    return fileUrl;
  } catch (error) {
    console.error("Error in selectFileToDownload:", error);
    throw error;
  }
}

async function downloadFile(fileUrl) {
  try {
    if (CFG_NAME_FILE) {
      const nameFileExists = await fileExists(CFG_NAME_FILE);
      if (nameFileExists) {
        const nameContent = await fsPromises.readFile(CFG_NAME_FILE, "utf8");
        if (nameContent === fileUrl) {
          console.log("Same url as last time. No need to download.");
          return;
        }
      }
    }

    const tmpFilePath = CFG_OUTPUT + ".tmp";
    console.log("Downloading file to", tmpFilePath);

    const curl = spawn("curl", ["-L", "--progress-bar", "-o", tmpFilePath, fileUrl]);

    // Filter out the progress bar lines
    let stderrBuffer = "";
    curl.stdout.pipe(process.stdout);
    curl.stderr.on("data", (data) => {
      stderrBuffer += data.toString().replace(/\x1b\[[0-9;]*m/g, "");
      const lines = stderrBuffer.split('\r');
      stderrBuffer = lines.pop();
      lines.forEach(line => {
        if (line.includes("%")) console.log(line);
      });
    });
    
    await new Promise((resolve, reject) => {
      curl.on("close", (code) => {
        if (code === 0) {
          console.log("Download completed successfully.");
          resolve();
        } else {
          reject(new Error(`curl process exited with code ${code}`));
        }
      });
    });

    // Move the file to the output location
    await fsPromises.rename(tmpFilePath, CFG_OUTPUT);
    console.log("File moved from", tmpFilePath, "to", CFG_OUTPUT);

    if (CFG_NAME_FILE) {
      await fsPromises.writeFile(CFG_NAME_FILE, fileUrl, "utf8");
      console.log("Name file updated.");
    }
  } catch (error) {
    console.error("Error in downloadFile:", error);
    throw error;
  }
}

// Update the time file with the current time
async function updateTimeFile() {
  try {
    const now = new Date();
    await fsPromises.writeFile(CFG_TIME_FILE, now.getTime().toString(), "utf8");
    console.log("Time file updated.");
  } catch (error) {
    console.error("Error in updateTimeFile:", error);
  }
}

// Restart the Docker container
function restartDockerContainer() {
  try {
    console.log(`Restarting Docker container ${CFG_CONTAINER}`);
    spawnSync("docker", ["restart", CFG_CONTAINER], { stdio: "inherit" });
    console.log("Docker container restarted.");
  } catch (error) {
    console.error("Error in restartDockerContainer:", error);
  }
}

main();
