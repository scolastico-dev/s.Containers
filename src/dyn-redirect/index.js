import express from 'express';
import fs, { existsSync } from 'fs';
import path from 'path';
import { promisify } from 'util';
import crypto from 'crypto';
import { rm } from 'fs/promises';

// Promisify necessary fs functions
const access = promisify(fs.access);
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Configuration
const DATA_DIR = process.env.DATA_DIR || './data';
const PORT = process.env.PORT || 3000;

// Ensure DATA_DIR exists
async function ensureDataDir() {
  try {
    await access(DATA_DIR, fs.constants.F_OK);
  } catch (err) {
    await mkdir(DATA_DIR, { recursive: true });
    console.log(`Created data directory at ${DATA_DIR}`);
  }
}

// Function to hash path patterns using SHA256
function hashPath(pattern) {
  return crypto.createHash('sha256').update(pattern).digest('hex');
}

// Load environment configurations
function loadEnvConfigs() {
  const env = process.env;
  const configs = [];

  // Extract unique IDs from environment variables
  const ids = new Set();
  Object.keys(env).forEach(key => {
    const match = key.match(/^CFG_(\d+)_/);
    if (match) {
      ids.add(match[1]);
    }
  });

  // Build config objects
  ids.forEach(id => {
    let pathPattern = env[`CFG_${id}_PATH`];
    const url = env[`CFG_${id}_URL`];
    const status = parseInt(env[`CFG_${id}_STATUS`], 10) || 302;
    const secret = env[`CFG_${id}_SECRET`] || null;

    // If pathPattern is undefined or null, skip this config
    if (pathPattern === undefined || pathPattern === null) {
      console.warn(`CFG_${id}_PATH is not defined. Skipping this config.`);
      return;
    }

    // If pathPattern is an empty string, interpret it as root path '/'
    if (pathPattern === '') {
      pathPattern = '^/$';
      console.log(`Config ID ${id}: Empty path interpreted as '^/$' for root path.`);
    }

    if (url) {
      try {
        // Validate regex
        new RegExp(pathPattern);
        configs.push({
          id,
          pathPattern,
          url,
          status,
          secret
        });
        console.log(`Loaded config ID ${id}: Path="${pathPattern}", URL="${url}", Status=${status}`);
      } catch (err) {
        console.error(`Invalid regex pattern for CFG_${id}_PATH: "${pathPattern}"`);
      }
    } else {
      console.warn(`Missing CFG_${id}_URL for ID ${id}. Skipping this config.`);
    }
  });

  return configs;
}

// Initialize Express app
const app = express();

// Use Express's built-in JSON parser
app.use(express.json());

// Main async function to set up routes
async function main() {
  await ensureDataDir();

  const configs = loadEnvConfigs();

  configs.forEach(config => {
    const { pathPattern, url, status, secret } = config;
    const hashedFilename = hashPath(pathPattern);
    const filePath = path.join(DATA_DIR, `${hashedFilename}.json`);

    // Convert pathPattern to a RegExp object
    let routeRegex;
    try {
      routeRegex = new RegExp(pathPattern);
    } catch (err) {
      console.error(`Failed to compile regex for pathPattern "${pathPattern}":`, err);
      return;
    }

    // GET handler for redirect
    app.get(routeRegex, async (req, res) => {
      let redirectUrl = url;

      try {
        await access(filePath, fs.constants.F_OK);
        const data = await readFile(filePath, 'utf-8');
        const parsed = JSON.parse(data);
        if (parsed.url) {
          redirectUrl = parsed.url;
        }
      } catch (err) {
        // File doesn't exist or error reading it; use env URL
      }

      // If content-type is JSON, return JSON response instead of redirect
      if (req.headers.accept === 'application/json') return res.json({ redirectUrl });

      return res.redirect(status, redirectUrl);
    });

    // If secret is defined, set up POST handler to update the redirect URL
    if (secret) {
      app.post(routeRegex, async (req, res) => {
        const { secret: reqSecret, url: newUrl } = req.body;

        if (!reqSecret || reqSecret !== secret) {
          return res.status(403).json({ error: 'Invalid or missing secret.' });
        }

        if (!newUrl) {
          if (existsSync(filePath)) await rm(filePath);
          console.log(`Removed redirect for pattern "${pathPattern}"`);
          return res.status(200).json({ message: 'Redirect URL removed successfully.' });
        }

        // Optional: Validate newUrl is a valid URL
        try {
          new URL(newUrl);
        } catch (err) {
          return res.status(400).json({ error: 'Invalid URL format.' });
        }

        // Write the new URL to the file
        const dataToWrite = JSON.stringify({ url: newUrl }, null, 2);
        try {
          await writeFile(filePath, dataToWrite, 'utf-8');
          console.log(`Updated redirect for pattern "${pathPattern}" to URL "${newUrl}"`);
          return res.status(200).json({ message: 'Redirect URL updated successfully.' });
        } catch (err) {
          console.error(`Error writing to file ${filePath}:`, err);
          return res.status(500).json({ error: 'Internal server error.' });
        }
      });
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'OK' });
  });

  // Handle undefined routes
  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // Start the server
  app.listen(PORT, () => {
    console.log(`Dynamic Redirect server is running on port ${PORT}`);
  });
}

// Execute the main function
main().catch(err => {
  console.error('Failed to start the server:', err);
  process.exit(1);
});
