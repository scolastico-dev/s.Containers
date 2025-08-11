import fs from 'fs/promises';
import { createWriteStream } from 'fs'; 
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { FileOperationConfig } from './types';

// --- Helper Functions ---

/**
 * Checks if a file or directory exists at a given path.
 */
const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Applies ownership (chown) and permissions (chmod) to a file or directory.
 */
const applyOverrides = async (config: FileOperationConfig, targetPath: string): Promise<void> => {
    const perms = parseInt(config.permissions, 8);
    await fs.chmod(targetPath, perms);
    await fs.chown(targetPath, config.ownerUid, config.ownerGid);
    console.log(`🔒 Applied permissions ${config.permissions} and ownership ${config.ownerUid}:${config.ownerGid} to ${targetPath}`);
};

/**
 * Downloads a file from a URL to a destination path.
 * @returns A promise that resolves when the download is complete.
 */
const downloadFile = (url: string, dest: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      // KORREKTUR: 'createWriteStream' wird jetzt direkt verwendet
      const fileStream = createWriteStream(dest);
      response.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(resolve as () => void)); // Cast to resolve type ambiguity
      fileStream.on('error', (err) => fs.unlink(dest).then(() => reject(err)));
    });
    request.on('error', reject);
  });
};

/**
 * Retrieves the content for an operation, either from a URL or from the config's content property.
 */
const getContent = async (config: FileOperationConfig): Promise<Buffer> => {
    if (config.url) {
        if (!config.isUnsecure && !config.url.startsWith('https')) {
            throw new Error(`URL for ${config.prefix} is not HTTPS. Use _UNSECURE=true to allow.`);
        }
        const tempPath = path.join('/tmp', `download_${Date.now()}`);
        await downloadFile(config.url, tempPath);
        const content = await fs.readFile(tempPath);
        await fs.unlink(tempPath);
        return content;
    }
    if (config.content === null) {
        throw new Error(`Operation ${config.prefix} requires CONTENT or URL, but neither was provided.`);
    }
    return config.isBase64 ? Buffer.from(config.content, 'base64') : Buffer.from(config.content, 'utf-8');
};

/**
 * Writes or downloads content to a specified path, then applies overrides.
 */
const writeOrDownloadContent = async (config: FileOperationConfig) => {
    const content = await getContent(config);
    await fs.writeFile(config.path, content);
    await applyOverrides(config, config.path);
};

/**
 * Recursively applies permissions to a directory and its contents.
 */
const applyPermsRecursive = async (config: FileOperationConfig, currentPath: string) => {
    const stats = await fs.lstat(currentPath);

    // Apply specific directory permissions if provided
    if (stats.isDirectory() && config.fixDirPerms && config.fixDirPerms !== 'false') {
        await fs.chmod(currentPath, parseInt(config.fixDirPerms, 8));
        await fs.chown(currentPath, config.ownerUid, config.ownerGid);
    } else {
        await applyOverrides(config, currentPath);
    }

    if (stats.isDirectory()) {
        const children = await fs.readdir(currentPath);
        for (const child of children) {
            await applyPermsRecursive(config, path.join(currentPath, child));
        }
    }
};

// --- Main Operation Executor ---

/**
 * Executes a single file operation based on its configuration.
 * @param config The configuration for the operation to execute.
 */
export async function executeOperation(config: FileOperationConfig): Promise<void> {
    console.log(`🚀 Starting mode '${config.mode}' for ${config.prefix} -> ${config.path}`);
    const exists = await pathExists(config.path);

    switch (config.mode) {
        case 'create':
            if (!exists) await writeOrDownloadContent(config);
            else console.log(`'create' skipped: ${config.path} already exists.`);
            break;

        case 'update':
            if (exists) {
                let currentContent = await fs.readFile(config.path);
                const newContent = await getContent(config);
                const finalContent = config.regex
                    ? Buffer.from(currentContent.toString('utf-8').replace(config.regex, newContent.toString('utf-8')))
                    : newContent;
                await fs.writeFile(config.path, finalContent);
                await applyOverrides(config, config.path);
            } else console.log(`'update' skipped: ${config.path} does not exist.`);
            break;

        case 'upsert':
            await writeOrDownloadContent(config); // Simplified: just writes/overwrites
            break;
            
        case 'replace':
            if (exists) await fs.unlink(config.path);
            await writeOrDownloadContent(config);
            break;

        case 'delete':
            if (exists) await fs.unlink(config.path);
            else console.log(`'delete' skipped: ${config.path} does not exist.`);
            break;
            
        case 'append':
            if (exists) {
                const contentToAppend = await getContent(config);
                await fs.appendFile(config.path, contentToAppend);
                await applyOverrides(config, config.path);
            }
            break;

        case 'prepend':
            if (exists) {
                const currentContent = await fs.readFile(config.path);
                const contentToPrepend = await getContent(config);
                await fs.writeFile(config.path, Buffer.concat([contentToPrepend, currentContent]));
                await applyOverrides(config, config.path);
            }
            break;

        case 'perm':
            if (exists) await applyOverrides(config, config.path);
            break;

        case 'permr':
            if (exists) await applyPermsRecursive(config, config.path);
            break;

        case 'mkdir':
            if (!exists) await fs.mkdir(config.path, { recursive: true });
            break;

        case 'unzip':
            await fs.mkdir(config.path, { recursive: true });
            const zipSource = config.url ? (await getContent(config)).toString() : config.content!;
            execSync(`unzip -o -q -d ${config.path} ${zipSource}`);
            if (config.url) await fs.unlink(zipSource); // Clean up downloaded zip
            await applyOverrides(config, config.path);
            break;

        case 'exists':
            if (!exists) throw new Error(`'exists' check failed: ${config.path} does not exist.`);
            break;

        case 'missing':
            if (exists) throw new Error(`'missing' check failed: ${config.path} exists.`);
            break;
            
        case 'npm':
            if (!config.content) throw new Error(`'npm' mode requires CONTENT with package name.`);
            const tarball = execSync(`npm pack ${config.content}`, { encoding: 'utf-8' }).trim();
            await fs.mkdir(config.path, { recursive: true });
            execSync(`tar -xzf ${tarball} -C ${config.path} --strip-components=1`);
            await fs.unlink(tarball);
            break;
            
        case 'cp':
            if (!config.content) throw new Error(`'cp' mode requires CONTENT with source file path.`);
            await fs.copyFile(config.content, config.path);
            await applyOverrides(config, config.path);
            break;

        default:
            // This check is for exhaustive switch cases with TypeScript
            const exhaustiveCheck: never = config.mode;
            throw new Error(`Unknown mode '${exhaustiveCheck}' for ${config.prefix}`);
    }
}
