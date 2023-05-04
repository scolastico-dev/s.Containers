const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = process.env.PORT || 3000;

const stdErrFun = data => console.error(`stderr: ${data}`)
const stdDeathFun = code => console.log(`child process exited with code ${code}`)

const ENV_REGEX = /^CFG_(\w+)_(IMAGE|CONTAINER|TOKEN|CLEANUP|KEEP|REGISTRY|USER|PASS)$/;

const cfg = {};

for (const key in process.env) {
  const match = ENV_REGEX.exec(key);
  if (match) {
    const [_, name, property] = match;
    if (!cfg[name]) {
      cfg[name] = {};
    }
    cfg[name][property.toLowerCase()] = process.env[key];
  }
}

for (const key in cfg) {
  if (!('cleanup' in cfg[key])) {
    cfg[key].cleanup = process.env.DEFAULT_CLEANUP === 'true' ? 'true' : 'false';
  }
  if (!('keep' in cfg[key])) {
    cfg[key].keep = process.env.DEFAULT_KEEP || '1';
  }
  cfg[key].cleanup = cfg[key].cleanup === 'true';
  cfg[key].keep = parseInt(cfg[key].keep, 10);
}

console.log('Parsed configuration:');
console.log(cfg);

function runDockerCommand(args, onData, onError, onClose) {
  console.log(`Running: docker ${args.join(' ').replaceAll('\t', ' ')}`);
  const command = spawn('docker', args);
  command.stdout.on('data', onData);
  command.stderr.on('data', onError);
  command.on('close', onClose);
}

async function pullImage(entry) {
  if (entry.registry && entry.user && entry.pass) {
    console.log(`Logging in to registry ${entry.registry}...`);
    await new Promise((resolve) => {
      runDockerCommand(
        ['login', entry.registry, '-u', entry.user, '-p', entry.pass],
        data => console.log(`stdout: ${data}`),
        stdErrFun,
        code => {
          stdDeathFun(code);
          resolve();
        }
      );
    });
  }

  console.log(`Pulling image ${entry.image}...`);
  await new Promise((resolve) => {
    runDockerCommand(
      ['pull', entry.image],
      data => console.log(`stdout: ${data}`),
      stdErrFun,
      code => {
        stdDeathFun(code);
        resolve();
      }
    );
  });

  if (entry.registry && entry.user && entry.pass) {
    console.log(`Logging out from registry ${entry.registry}...`);
    await new Promise((resolve) => {
      runDockerCommand(
        ['logout', entry.registry],
        data => console.log(`stdout: ${data}`),
        stdErrFun,
        code => {
          stdDeathFun(code);
          resolve();
        }
      );
    });
  }
}

app.get('/:token', async (req, res) => {
  console.log(`Received request: ${req.method} ${req.url} from ${req.ip}`);
  const token = req.params.token;

  const entryName = Object.keys(cfg).find(name => cfg[name].token === token);
  const entry = cfg[entryName];

  if (!entry) {
    res.status(404).send('Token not found');
    return;
  }

  if (token.length < 32) {
    console.warn(`Warning: Token is shorter than 32 characters: ${token}`);
  }

  console.log(`Starting operation for ${entryName}...`);

  if (entry.image) await pullImage(entry);

  if (entry.container) {
    console.log(`Restarting container ${entry.container}...`);
    await new Promise((resolve) => {
      runDockerCommand(
        ['restart', entry.container],
        data => console.log(`stdout: ${data}`),
        stdErrFun,
        code => {
          stdDeathFun(code);
          resolve();
        }
      );
    });
  }

  if (entry.cleanup) {
    console.log(`Cleaning up images for ${entryName}...`);
    await new Promise((resolve) => {
      runDockerCommand(
        ['image', 'ls', '--filter', 'dangling=true', '--format', '{{.ID}}\t{{.CreatedAt}}\t{{.Repository}}'],
        async data => {
          const allImagesData = data.toString().trim().split('\n');
          const filteredImageData = allImagesData.filter(imageData => imageData.includes(entry.image));
          const sortedImageData = filteredImageData.sort((a, b) => new Date(b.split('\t')[1]) - new Date(a.split('\t')[1]));
          const imageIds = sortedImageData.map(imageData => imageData.split('\t')[0]).slice(entry.keep);

          for (const imageId of imageIds) {
            await new Promise((resolveImage) => {
              runDockerCommand(
                ['image', 'rm', imageId],
                data => {
                  console.log(`stdout: ${data}`);
                  resolveImage();
                },
                data => {
                  console.error(`stderr: ${data}`);
                  resolveImage();
                },
                code => {
                  stdDeathFun(code)
                  resolveImage();
                }
              );
            });
          }
          resolve();
        },
        stdErrFun, stdDeathFun
      );
    });
  }

  res.send('Operation completed');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
