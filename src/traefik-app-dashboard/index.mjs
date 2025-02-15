import { createHash } from 'crypto'
import { existsSync } from 'fs'
import Docker from 'dockerode'
import express from 'express'
import axios from 'axios'


const OPTIONS = {
  TRAEFIK_API: process.env.TRAEFIK_API || 'http://traefik:8080',
  IGNORE_REGEX: process.env.IGNORE_REGEX,
  CACHE_TTL: process.env.CACHE_TTL || 60,
}

const PREFIX = 'traefik-app-dashboard.'

const app = express()
let cache = null

async function getDataFromLabels() {
  if (!existsSync('/var/run/docker.sock')) return {}
  const docker = new Docker({ socketPath: '/var/run/docker.sock' })
  const containers = await docker.listContainers()
  const res = {};
  for (const container of containers) {
    const c = await docker.getContainer(container.Id).inspect()
    const { Labels } = c.Config
    if (!Labels) continue
    const service = Labels[PREFIX + 'service'];
    if (!service) continue
    res[service] = {
      name: Labels[PREFIX + 'name'] || service,
      url: Labels[PREFIX + 'url'],
      img: Labels[PREFIX + 'img'],
      description: Labels[PREFIX + 'description'],
    }
  }
  return res
}

async function getData() {
  if (cache) return cache
  const { data } = await axios.get(`${OPTIONS.TRAEFIK_API}/api/http/routers`)
  const labels = await getDataFromLabels()
  const arr = []
  for (const router of data) {
    if (OPTIONS.IGNORE_REGEX && new RegExp(OPTIONS.IGNORE_REGEX).test(router.service)) continue
    const OVERRIDE_KEY = `OVERRIDE_${router.service.toUpperCase()}`
    const OVERRIDES = {
      NAME: process.env[`${OVERRIDE_KEY}_NAME`],
      URL: process.env[`${OVERRIDE_KEY}_URL`],
      IMG: process.env[`${OVERRIDE_KEY}_IMG`],
      DESCRIPTION: process.env[`${OVERRIDE_KEY}_DESCRIPTION`],
    }
    const label = labels[router.service] || {}
    if (!OVERRIDES.URL && !label.url && !router.rule.includes('Host(')) {
      console.warn(`Router ${router.service} has no Host rule, skipping`)
      continue
    }
    arr.push({
      name: OVERRIDES.NAME || label.name || router.service,
      url: OVERRIDES.URL || label.url || ('http://' + router.rule.match(/Host\(`([^`]+)`\)/)[1]),
      id: createHash('md5').update(router.service).digest('hex'),
      img: OVERRIDES.IMG || label.img,
      description: OVERRIDES.DESCRIPTION || label.description,
    })
  }
  cache = arr
  setTimeout(() => (cache = null), OPTIONS.CACHE_TTL * 1000)
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
