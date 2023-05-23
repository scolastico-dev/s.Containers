const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');

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
      overridesUser: process.env[`${prefix}_OVERRIDES_USER`] || '1000',
      overridesGroup: process.env[`${prefix}_OVERRIDES_GROUP`] || '1000',
      overridesPermissions: process.env[`${prefix}_OVERRIDES_PERMISSIONS`] || '777',
      mode: process.env[`${prefix}_MODE`] || 'create',
      regex: process.env[`${prefix}_REGEX`] || null,
      failOnError: process.env[`${prefix}_FAIL_ON_ERROR`] === 'true',
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

function processFiles() {
  for (const file of processEnv()) {
    file.mode = file.mode.toLowerCase();
    if (file.url && !file.unsecure && !file.url.startsWith('https')) {
      console.error(`URL for ${file.prefix} is not secure. Skipping.`);
      if (file.failOnError) process.exit(1);
      continue;
    }

    try {
      if (file.mode === 'create' && !fs.existsSync(file.path)) {
        if (file.url) {
          downloadFile(file.url, file.path, () => {
            applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
          });
        } else {
          fs.writeFileSync(file.path, file.content);
          applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
        }
      } else if (file.mode === 'update' && fs.existsSync(file.path)) {
        let fileContent = fs.readFileSync(path, 'utf8');
        if (file.regex) {
          const regexObj = new RegExp(regex, 'g');
          fileContent = fileContent.replace(regexObj, content);
        } else {
          fileContent = file.content;
        }
        fs.writeFileSync(file.path, fileContent);
        applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
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
          fs.writeFileSync(file.path, file.content);
          applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
        }
      } else if (file.mode === 'append') {
        if (fs.existsSync(file.path)) {
          const fileContent = fs.readFileSync(file.path, 'utf8');
          const newContent = fileContent + file.content;
          fs.writeFileSync(file.path, newContent);
          applyOverrides(file.path, file.overridesUser, file.overridesGroup, file.overridesPermissions);
        }
      } else if (file.mode === 'prepend') {
        if (fs.existsSync(file.path)) {
          const fileContent = fs.readFileSync(file.path, 'utf8');
          const newContent = file.content + fileContent;
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
            for (const subPath of fs.readdirSync(path)) {
              chmod(path + '/' + subPath);
            }
          }
        }
        chmod(file.path);
      } else if (file.mode === 'mkdir') {
        fs.mkdirSync(file.path, { recursive: true });
      } else throw new Error(`Unknown mode ${file.mode} for ${file.prefix}`);
    } catch (error) {
      console.error(`Error processing ${file.prefix}: ${error.message}`);
      if (file.failOnError) process.exit(1);
    }
  }
}

async function sleep(ms, reason) {
  if (!ms) return;
  if (typeof ms !== 'number') ms = parseInt(ms, 10);
  console.log(`Sleeping for ${ms} ms ${reason ? `(${reason})` : ''}`);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  await sleep(process.env.SLEEP, 'before');
  processFiles();
  await sleep(process.env.SLEEP_AFTER, 'after');
})();
