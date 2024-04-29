const express = require('express')
const ical = require('node-ical');
const app = express()
const port = 3000

// Base config object
const config = {
  onDemand: process.env.ICS_ON_DEMAND === 'true',
  ics: [],
  replace: [],
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

counter = 0
while (process.env[`REPLACE_${counter}_FROM`]) {
  config.replace.push({
    from: process.env[`REPLACE_${counter}_FROM`],
    to: process.env[`REPLACE_${counter}_TO`],
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
    const raw = await (async () => {
      let t = await fetch(url).then(res => res.text())
      for (const r of config.replace) {
        t = t.replaceAll(r.from, r.to)
      }
      return t
    })()
    const obj = await ical.async.parseICS(raw)
    const events = []
    for (const key in obj) {
      const event = obj[key]
      if (event.type !== 'VEVENT') continue
      if (!event.uid) {
        console.warn('Event without UID:', event)
        continue
      }
      console.log(event.summary)
      const getTime = (x, t) => {
        try {
          const d = new Date(t)
          return [
              x + ':' + (d
                .toISOString()
                .replaceAll('-', '')
                .replaceAll(':', '')
                .substring(0, 15)) + 'Z'
            ]
        } catch (ignored) {}
        return []
      }
      const getString = (x, t) => {
        if (!t || t === '') return []
        return [`${x}:${t.toString().replaceAll('\r\n', ' ').replaceAll('\n', ' ')}`]
      }
      events.push([
        `BEGIN:VEVENT`,
        `UID:${event.uid}`,
        ...getTime('DTSTART', event.start),
        ...getTime('DTEND', event.end),
        ...getTime('DTSTAMP', event.start),
        ...getString('STATUS', event.status),
        ...getString('SUMMARY', event.summary),
        ...getString('LOCATION', event.location),
        ...getString('DESCRIPTION', event.description),
        ...getString('URL', event.url),
        ...getString('PRIORITY', event.priority),
        ...getString('CLASS', event.class),
        ...getString('SEQUENCE', event.sequence),
        ...getString('TRANSP', event.transparency),
        ...getString('RRULE', event.rrule),
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
      ).replaceAll('\r\n', ' ').replaceAll('\n', ' ')}`,
      ...events.filter(e => e),
      `END:VCALENDAR`
    ]
      .join('\n')
      .split('\n')
      .map(x => x.length > 75 ? x.match(/.{1,75}/g).join('\n ') : x)
      .join('\n')
      .replaceAll('\r\n', '\n')
      .replaceAll('\n', '\r\n')
  })
}

app.get('*', (req, res) => {
  console.log(`${new Date()} ${req.ip} ${req.url}`)
  const path = req.path.substring(1)

  const sendICS = (string) => {
    // if req params contains as-text, send as text
    if (req.query['as-text']) {
      res.set('Content-Type', 'text/plain')
    } else {
      res.set('Content-Disposition', 'attachment; filename="calendar.ics"')
      res.set('Content-Type', 'text/calendar')
    }
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
