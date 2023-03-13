import * as fs from 'fs';
import axios from 'axios';
import https from 'https';

const fileConfigs = {};

Object.keys(process.env).forEach(envVarName => {
  const matches = envVarName.match(/^FILE_(.+?)_(PATH|CONTENT|URL|UNSECURE|OVERRIDES_USER|OVERRIDES_GROUP|OVERRIDES_PERMISSIONS)$/);
  if (matches) {
    const [_, name, property] = matches;
    if (!fileConfigs[name]) {
      fileConfigs[name] = {};
    }
    fileConfigs[name][property.toLowerCase()] = process.env[envVarName];
  }
});

console.log(JSON.stringify(fileConfigs, null, 2));

Object.keys(fileConfigs).forEach(name => {
  const { path, content, url, unsecure, overrides_user, overrides_group, overrides_permissions } = fileConfigs[name];
  if (url) {
    const httpsAgent = unsecure ? new https.Agent({ rejectUnauthorized: false }) : undefined;
    axios.get(url, {
      httpsAgent,
    }).then(response => {
      fs.writeFileSync(path || name, response.data, {
        mode: overrides_permissions ? parseInt(overrides_permissions, 8) : 0o777,
        uid: overrides_user ? parseInt(overrides_user) : undefined,
        gid: overrides_group ? parseInt(overrides_group) : undefined,
      });
    }).catch(error => {
      console.error(`Failed to download file ${name} from URL ${url}: ${error}`);
      if (content) {
        fs.writeFileSync(path || name, content, {
          mode: overrides_permissions ? parseInt(overrides_permissions, 8) : 0o777,
          uid: overrides_user ? parseInt(overrides_user) : undefined,
          gid: overrides_group ? parseInt(overrides_group) : undefined,
        });
      }
    });
  } else {
    const fileContent = content || '';
    fs.writeFileSync(path || name, fileContent, {
      mode: overrides_permissions ? parseInt(overrides_permissions, 8) : 0o777,
      uid: overrides_user ? parseInt(overrides_user) : undefined,
      gid: overrides_group ? parseInt(overrides_group) : undefined,
    });
  }
});
