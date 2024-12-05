const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');
const child = require('child_process');

function downloadFile(url, dest, cb) {
  const protocol = url.startsWith('https') ? https : http;
  const file = fs.createWriteStream(dest);
  const request = protocol.get(url, function (response) {
    response.pipe(file);
    file.on('finish', function () {
      file.close(cb);
    });
  });
}

function applyOverrides(filePath, overridesUser, overridesGroup, overridesPermissions) {
  fs.chmodSync(filePath, parseInt(overridesPermissions, 8));
  fs.chownSync(filePath, parseInt(overridesUser, 10), parseInt(overridesGroup, 10));
}

function processEnv() {
  const files = [];
  for (const envVar in process.env) if (envVar.startsWith('FILE_') && envVar.endsWith('_PATH')) {
    const prefix = envVar.slice(0, -5);
    files.push({
      prefix,
      path: process.env[envVar],
      content: process.env[`${prefix}_CONTENT`],
      url: process.env[`${prefix}_URL`],
      unsecure: process.env[`${prefix}_UNSECURE`] === 'true',
      base64: process.env[`${prefix}_BASE64`] === 'true',
      overridesUser: process.env[`${prefix}_OVERRIDES_USER`] || '1000',
      overridesGroup: process.env[`${prefix}_OVERRIDES_GROUP`] || '1000',
      overridesPermissions: process.env[`${prefix}_OVERRIDES_PERMISSIONS`] || '777',
      mode: process.env[`${prefix}_MODE`] || 'create',
      regex: process.env[`${prefix}_REGEX`] || null,
      failOnError: process.env[`${prefix}_FAIL_ON_ERROR`] === 'true',
      fixDirPerms: process.env[`${prefix}_FIX_DIR_PERMS`] || 'false',
      sleepBefore: parseInt(process.env[`${prefix}_SLEEP_BEFORE`] || '0'),
      sleepAfter: parseInt(process.env[`${prefix}_SLEEP_AFTER`] || '0'),
    });
  }
  const sort = (process.env.ORDER || process.env.SORT || '')
    .split(',')
    .map((s) => 'FILE_' + s.trim())
    .filter((s) => s.length > 5);
  console.log('Sort order:');
  console.log(JSON.stringify(sort, null, 2));
  const inSort = files.filter((f) => sort.indexOf(f.prefix) !== -1);
  const notInSort = files.filter((f) => sort.indexOf(f.prefix) === -1);
  const ret = [
    ...inSort.sort((a, b) => sort.indexOf(a.prefix) - sort.indexOf(b.prefix)),
    ...notInSort.sort((a, b) => a.prefix.localeCompare(b.prefix)),
  ]
  console.log('Loaded files:');
  console.log(JSON.stringify(ret, null, 2));
  return ret;
}

async function sleep(ms, reason) {
  if (!ms) return;
  if (typeof ms !== 'number') ms = parseInt(ms, 10);
  console.log(`Sleeping for ${ms} ms ${reason ? `(${reason})` : ''}`);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function processFiles() {
  for (const file of processEnv()) {
    file.mode = file.mode.toLowerCase();
    if (file.url && !file.unsecure && !file.url.startsWith('https')) {
      console.error(`URL for ${file.prefix} is not secure. Skipping.`);
      if (file.failOnError) process.exit(1);
      continue;
    }

    console.log(`Processing ${file.mode} for ${file.prefix}`);
    if (file.sleepBefore) {
      console.log(`Sleeping for ${file.sleepBefore} ms before ${file.prefix}`);
      await sleep(file.sleepBefore, 'before');
    }

    try {
      const doCreate = () => {
        if (file.url) {
          downloadFile(file.url, file.path, () => {
            applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
          });
        } else {
          fs.writeFileSync(file.path, file.base64 ? Buffer.from(file.content, 'base64') : file.content);
          applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
        }
      }
      const doUpdate = () => {
        let fileContent = fs.readFileSync(file.path, 'utf8');
        if (file.regex) {
          const regexObj = new RegExp(file.regex, 'g');
          fileContent = fileContent.replace(regexObj, file.base64 ? Buffer.from(file.content, 'base64') : file.content);
        } else {
          fileContent = file.base64 ? Buffer.from(file.content, 'base64') : file.content;
        }
        fs.writeFileSync(file.path, fileContent);
        applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
      }

      if (file.mode === 'create' && !fs.existsSync(file.path)) {
        doCreate();
      } else if (file.mode === 'update' && fs.existsSync(file.path)) {
        doUpdate();
      } else if (file.mode === 'upsert') {
        if (fs.existsSync(file.path)) {
          doUpdate();
        } else {
          doCreate();
        }
      } else if (file.mode === 'delete') {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } else if (file.mode === 'replace') {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        if (file.url) {
          downloadFile(file.url, file.path, () => {
            applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
          });
        } else {
          fs.writeFileSync(file.path, file.base64 ? Buffer.from(file.content, 'base64') : file.content);
          applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
        }
      } else if (file.mode === 'append') {
        if (fs.existsSync(file.path)) {
          const fileContent = fs.readFileSync(file.path, 'utf8');
          const newContent = fileContent + (file.base64 ? Buffer.from(file.content, 'base64') : file.content);
          fs.writeFileSync(file.path, newContent);
          applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
        }
      } else if (file.mode === 'prepend') {
        if (fs.existsSync(file.path)) {
          const fileContent = fs.readFileSync(file.path, 'utf8');
          const newContent = (file.base64 ? Buffer.from(file.content, 'base64') : file.content) + fileContent;
          fs.writeFileSync(file.path, newContent);
          applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
        }
      } else if (file.mode === 'perm') {
        if (fs.existsSync(file.path)) {
          applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
        }
      } else if (file.mode === 'permr') {
        const chmod = (path) => {
          if (fs.existsSync(path)) {
            applyOverrides(path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
          }
          if (fs.lstatSync(path).isDirectory()) {
            if (file.fixDirPerms !== 'false') {
              applyOverrides(path, file.overridesUser, file.overridesGroup, file.fixDirPerms);
            }
            for (const subPath of fs.readdirSync(path)) {
              chmod(path + '/' + subPath);
            }
          }
        }
        chmod(file.path);
      } else if (file.mode === 'mkdir') {
        fs.mkdirSync(file.path, { recursive: true });
      } else if (file.mode === 'unzip') {
        if (file.url) {
          downloadFile(file.url, '/app/tmp.zip', () => {
            child.execSync(`unzip -o -q -d ${file.path} /app/tmp.zip`);
            fs.rmSync('/app/tmp.zip');
            applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
          });
        } else {
          child.execSync(`unzip -o -q -d ${file.path} ${file.content}`);
          applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
        }
      } else if (file.mode === 'exists') {
        if (!fs.existsSync(file.path)) throw new Error(`File ${file.path} does not exist`);
      } else if (file.mode === 'missing') {
        if (fs.existsSync(file.path)) throw new Error(`File ${file.path} exists`);
      } else if (file.mode === 'npm') {
        const tarball = child.execSync(`npm pack ${file.content || file.url}`, {encoding: 'utf-8'}).trim();
        const targetDirectory = file.path
        if (!fs.existsSync(targetDirectory)) {
          fs.mkdirSync(targetDirectory, { recursive: true });
        }
        child.execSync(`tar -xzf ${tarball} -C ${targetDirectory}`);
        fs.unlinkSync(tarball);
      } else throw new Error(`Unknown mode ${file.mode} for ${file.prefix}`);

      if (file.sleepAfter) {
        console.log(`Sleeping for ${file.sleepAfter} ms after ${file.prefix}`);
        await sleep(file.sleepAfter, 'after');
      }
    } catch (error) {
      console.error(`Error processing ${file.prefix}: ${error.message}`);
      if (file.failOnError) process.exit(1);
    }
  }
}

if (process.env.SILENT === 'true') console.log = () => {};

(async () => {
  await sleep(process.env.SLEEP, 'before');
  await processFiles();
  await sleep(process.env.SLEEP_AFTER, 'after');
})();
