import { readFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';
import axios from 'axios';

const OPTIONS = {
  PORTAINER_URL: process.env.PORTAINER_URL,
  PORTAINER_KEY: process.env.PORTAINER_KEY,
  STACK_ID: process.env.STACK_ID,
  ENDPOINT_ID: process.env.ENDPOINT_ID,
  STACK_FILE: process.env.STACK_FILE || 'compose.yml',
  IGNORE_DOT_ENV: process.env.IGNORE_DOT_ENV === 'true',
  RE_PULL_IMAGES: process.env.RE_PULL_IMAGES !== 'false',
  PRUNE_SERVICES: process.env.PRUNE_SERVICES !== 'false',
}

if (!OPTIONS.PORTAINER_URL || !OPTIONS.PORTAINER_KEY || !OPTIONS.STACK_ID || !OPTIONS.ENDPOINT_ID) {
  console.error('PORTAINER_URL, PORTAINER_KEY, STACK_ID, and ENDPOINT_ID must be set')
  process.exit(1)
}

(async () => {
  const env = OPTIONS.IGNORE_DOT_ENV ? {} : existsSync('.env') ? dotenv.parse(readFileSync('.env')) : {}
  const stack = readFileSync(OPTIONS.STACK_FILE, 'utf8')
  await axios.put(`${OPTIONS.PORTAINER_URL}/stacks/${OPTIONS.STACK_ID}`, {
    stackFileContent: stack,
    env: Object.entries(env).map(([name, value]) => ({ name, value })),
    prune: OPTIONS.PRUNE_SERVICES,
    pullImage: OPTIONS.RE_PULL_IMAGES,
  }, {
    headers: {
      'X-API-Key': `${OPTIONS.PORTAINER_KEY}`,
    },
    params: {
      endpointId: OPTIONS.ENDPOINT_ID,
    },
  })
})();
