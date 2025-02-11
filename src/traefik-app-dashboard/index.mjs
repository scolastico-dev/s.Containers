import { readFileSync, existsSync } from 'fs'
import express from 'express'
import axios from 'axios'


const OPTIONS = {
  TRAEFIK_API: process.env.TRAEFIK_API || 'http://traefik:8080',
  IGNORE_REGEX: process.env.IGNORE_REGEX,
}

const app = express()

app.get('/data.json', async (req, res) => {
  try {
    const { data } = await axios.get(`${OPTIONS.TRAEFIK_API}/api/http/routers`)
    const arr = [];
    for (const router of data) {
      if (OPTIONS.IGNORE_REGEX && new RegExp(OPTIONS.IGNORE_REGEX).test(router.rule)) continue
      if (!router.rule.includes('Host(')) {
        console.warn(`Router ${router.service} has no Host rule, skipping`)
        continue
      }
      arr.push({
        name: router.service,
        url: router.rule.match(/Host\(`([^`]+)`\)/)[1],
      })
    }
    res.json(arr)
  } catch (err) {
    console.error(err)
    res.status(500).send('Internal server error')
  }
})

app.use(express.static('ui/dist'))

app.listen(3000, () => console.log('Server running on port 3000'))
