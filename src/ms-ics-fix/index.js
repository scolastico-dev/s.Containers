const express = require('express')
const app = express()
const port = 3000

// Base config object
const config = {
  onDemand: process.env.ICS_ON_DEMAND === 'true',
  ics: []
}

// Parse ICS configurations from environment variables
let counter = 0
while (process.env[`ICS_${counter}_URL`]) {
  config.ics.push({
    url: process.env[`ICS_${counter}_URL`],
    tz: process.env[`ICS_${counter}_TZID`],
    path: process.env[`ICS_${counter}_PATH`],
  })
  counter++
}

// Validate and normalize ICS configurations
config.ics = (() => {
  const n = []
  const s = new Set()
  for (const ics of config.ics) {
    if (!ics.url || !ics.tz) continue // Skip invalid ICS
    if (s.has(ics.path)) ics.path = null // Reset path if duplicated
    let c = -1
    if (!ics.path) do { // Generate path if not provided
      c++
      ics.path = `${c}.ics`
    } while (s.has(ics.path))
    s.add(ics.path)
    n.push(ics)
  }
  return n
})();

// The little magic, microsoft is too lazy to implement...
async function doIcsFix(url, tz) {
  const ics = await fetch(url).then(res => res.text())
  return ics.replace(/^TZID:.*$/gm, `TZID:${tz}`)
}

app.get('*', (req, res) => {
  console.log(`${new Date()} ${req.ip} ${req.url}`)
  const path = req.path.substring(1)

  const sendICS = (string) => {
    res.set('Content-Type', 'text/calendar')
    res.send(string)
  }

  if (config.onDemand && path === '') {
    const { url, tz } = req.query
    if (!url || !tz) {
      res.status(400).send('Bad Request')
      return
    }
    doIcsFix(url, tz).then(sendICS)
    return
  }

  const ics = config.ics.find(ics => ics.path === path)
  if (!ics) {
    res.status(404).send('Not Found')
    return
  }

  doIcsFix(ics.url, ics.tz).then(sendICS)
})

app.listen(port, () => {
  console.log(`s.containers/ms-ics-fix listening on port ${port}`)
})
