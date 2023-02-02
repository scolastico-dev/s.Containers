import { spawn } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import axios from 'axios';

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('close', (code) => {
      if (code !== 0) {
        reject({ command: `${command} ${args.join(' ')}` });
        return;
      }
      resolve();
    });
  });
}

(async () => {
  console.log('Zipping...');
  const dir = process.env.UPLOAD_DIR;
  if (!dir) {
    console.error('Please specify a directory');
    process.exit(1);
  }
  if (!fs.existsSync(dir)) {
    console.error('Directory does not exist');
    process.exit(1);
  }
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    console.error('Path is not a directory');
    process.exit(1);
  }
  await runCommand('rm', ['-rf', '../dist.zip'], { cwd: dir });
  await runCommand('zip', ['-r', '../dist.zip', '.'], { cwd: dir });
  let hash = process.env.SECRET;
  if (!hash) {
    console.error('Please specify a secret');
    process.exit(1);
  }
  let url = process.env.SERVER_URL
  if (!url) {
    console.error('Please specify a server url');
    process.exit(1);
  }
  if (!url.endsWith('/')) url += '/';
  const name = process.env.SERVER_NAME
  const iterations = process.env.ITERATIONS
  if (iterations) {
    const response = await axios.get(url);
    if (!response.data.otp) {
      console.error('Server did not return an otp');
      process.exit(1);
    }
    hash = response.data.otp + hash;
    for (let i = 0; i < iterations; i++) {
      // log every 5%
      if (i % (iterations / 20) === 0) {
        console.log('Hashing... ' + Math.round(i / iterations * 100) + '%');
      }
      const md5 = crypto.createHash('md5');
      hash = md5.update(hash).digest('hex');
    }
  }
  console.log('Uploading...');
  await runCommand('curl', [
    '-F',
    `zip=@../dist.zip`,
    url + name + '/' + hash,
  ], { cwd: dir });
  console.log('\n\n\nDone!\n');
})();
