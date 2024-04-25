const express = require('express')
const ical = require('node-ical');
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
    path: process.env[`ICS_${counter}_PATH`],
  })
  counter++
}

// Validate and normalize ICS configurations
config.ics = (() => {
  const n = []
  const s = new Set()
  for (const ics of config.ics) {
    if (!ics.url) continue // Skip invalid ICS
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


// Cache function
const _cache = {}
async function cache(url, fun) {
  if (_cache[url]) {
    const { time, data } = _cache[url]
    if (Date.now() - time < 60000) return data
  }
  _cache[url] = {
    time: Date.now(),
    data: await fun()
  }
  return _cache[url].data
}

// The little magic, microsoft is too lazy to implement...
async function doIcsFix(url) {
  return await cache(url, async () => {
    const raw = await fetch(url).then(res => res.text())
    const obj = await ical.async.parseICS(raw)
    const events = []
    for (const key in obj) {
      const event = obj[key]
      if (!event.uid) continue
      const getTime = (t) => {
        try {
          const d = new Date(t)
          return d
            .toISOString()
            .replaceAll('-', '')
            .replaceAll(':', '')
            .substring(0, 15) + 'Z'
        } catch (ignored) {}
        return '19700101T000000Z'
      }
      events.push([
        `BEGIN:VEVENT`,
        `UID:${event.uid}`,
        `DTSTART:${getTime(event.start)}`,
        `DTEND:${getTime(event.end)}`,
        `DTSTAMP:${getTime(event.start)}`,
        `STATUS:${(event.status || '').toString().replaceAll('\n', ' ')}`,
        `LOCATION:${(event.location || '').toString().replaceAll('\n', ' ')}`,
        `SUMMARY:${(event.summary || '').toString().replaceAll('\n', ' ')}`,
        `END:VEVENT`
      ].join('\n'))
    }
    return [
      `BEGIN:VCALENDAR`,
      `VERSION:2.0`,
      `PRODID:-//hacksw/handcal//NONSGML v1.0//EN`,
      `X-WR-CALNAME:${(
        (
          raw.split('\n').find(l => l.startsWith('X-WR-CALNAME:')
        ) || ':Missing Calendar Name!').split(':')[1]
      ).replaceAll('\n', ' ')}`,
      events.join('\n'),
      `END:VCALENDAR`
    ].join('\n').replaceAll('\n', '\r\n')
  })
}

app.get('*', (req, res) => {
  console.log(`${new Date()} ${req.ip} ${req.url}`)
  const path = req.path.substring(1)

  const sendICS = (string) => {
    res.set('Content-Type', 'text/calendar')
    res.send(string)
  }

  if (config.onDemand && path === '') {
    const { url } = req.query
    if (!url) {
      res.status(400).send('Bad Request')
      return
    }
    doIcsFix(url).then(sendICS)
    return
  }

  const ics = config.ics.find(ics => ics.path === path)
  if (!ics) {
    res.status(404).send('Not Found')
    return
  }

  doIcsFix(ics.url).then(sendICS)
})

app.listen(port, () => {
  console.log(`s.containers/ms-ics-fix listening on port ${port}`)
})
