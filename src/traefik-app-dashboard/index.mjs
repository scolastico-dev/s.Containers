import { createHash } from 'crypto'
import express from 'express'
import axios from 'axios'


const OPTIONS = {
  TRAEFIK_API: process.env.TRAEFIK_API || 'http://traefik:8080',
  IGNORE_REGEX: process.env.IGNORE_REGEX,
}

const app = express()

async function getData() {
  const { data } = await axios.get(`${OPTIONS.TRAEFIK_API}/api/http/routers`)
  const arr = [];
  for (const router of data) {
    if (OPTIONS.IGNORE_REGEX && new RegExp(OPTIONS.IGNORE_REGEX).test(router.rule)) continue
    const OVERRIDE_KEY = `OVERRIDE_${router.service.toUpperCase()}`
    const OVERRIDES = {
      NAME: process.env[`${OVERRIDE_KEY}_NAME`],
      URL: process.env[`${OVERRIDE_KEY}_URL`],
      IMG: process.env[`${OVERRIDE_KEY}_IMG`],
      DESCRIPTION: process.env[`${OVERRIDE_KEY}_DESCRIPTION`],
    }
    if (!OVERRIDES.URL && !router.rule.includes('Host(')) {
      console.warn(`Router ${router.service} has no Host rule, skipping`)
      continue
    }
    arr.push({
      name: OVERRIDES.NAME || router.service,
      url: OVERRIDES.URL || router.rule.match(/Host\(`([^`]+)`\)/)[1],
      id: createHash('md5').update(router.service).digest('hex'),
      img: OVERRIDES.IMG,
      description: OVERRIDES.DESCRIPTION,
    })
  }
  return arr
}

app.get('/data.json', async (_, res) => {
  try {
    res.json(await getData())
  } catch (err) {
    console.error(err)
    res.status(500).send('Internal server error')
  }
})

app.use(express.static('ui/dist'))

app.listen(3000, () => console.log('Server running on port 3000'))
