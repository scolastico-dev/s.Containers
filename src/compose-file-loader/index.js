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
  const sort = (process.env.SORT || '').split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  // sort by prefix (without FILE_ and _PATH) and append non-sorted files
  return files.sort((a, b) => {
    if (sort.length === 0) return 0;
    if (sort.indexOf(a.prefix) === -1) return 1;
    if (sort.indexOf(b.prefix) === -1) return -1;
    return sort.indexOf(a.prefix) - sort.indexOf(b.prefix);
  });
}

function processFiles() {
  for (const file of processEnv()) {
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
      }
    } catch (error) {
      console.error(`Error processing ${file.prefix}: ${error.message}`);
      if (file.failOnError) process.exit(1);
    }
  }
}

processFiles();