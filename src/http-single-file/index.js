const express = require('express')
const axios = require('axios')
const fs = require('fs')
const app = express()
const env = process.env
const port = Number(env.PORT || 3000)

// handle SIGINT and SIGTERM
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`Received ${signal}, exiting`)
    process.exit(0)
  })
}

(async () => {
  let cache = [];
  const cache_count = Number(env.MERGE_DYNAMIC_CACHE_COUNT || 0)
  const cache_time = Number(env.MERGE_DYNAMIC_CACHE_TIME || 60)
  let content, merge = ''
  
  if (env.FILE_PATH && fs.existsSync(env.FILE_PATH)) {
    content = fs.readFileSync(env.FILE_PATH, 'utf8')
  }
  
  if (!content && env.FILE_CONTENT) {
    content = env.FILE_CONTENT
  }
  
  if (!content) {
    console.warn('[warn] No content found, please set FILE_PATH or FILE_CONTENT')
  }
  
  if (env.MERGE_FILE && fs.existsSync(env.MERGE_FILE)) {
    merge = fs.readFileSync(env.MERGE_FILE, 'utf8')
  }
  
  if (!merge && env.MERGE_URL) {
    while (!merge) {
      try {
        merge = (await axios.get(env.MERGE_URL, {
          responseType: 'text',
          headers: {
            'Cache-Control': 'no-cache'
          },
        })).data
      } catch (e) {
        console.warn('[warn] Failed to fetch merge content, retrying in 5 seconds...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }
  
  if (merge) {
    switch (env.MERGE_METHOD || 'append') {
      case 'append':
        content = merge + content
        break
      case 'prepend':
        content += merge
        break
      default:
        console.warn('[warn] Unknown merge method, please set MERGE_METHOD to "append" or "prepend"')
    }
  }
  
  app.get('*', async (req, res) => {
    console.log(`Received request: ${req.method} ${req.url}`)
    res.setHeader('content-type', env.FILE_TYPE || 'text/plain')
    if (!env.MERGE_DYNAMIC_URL) return res.send(content)
    try {
      if (cache[req.originalUrl] && cache[req.originalUrl].expires > Date.now()) {
        return res.send(cache[req.originalUrl].content)
      }
      const dMerge = (await axios.get(env.MERGE_DYNAMIC_URL + req.originalUrl, {
        responseType: 'text',
        headers: {
          'Cache-Control': 'no-cache'
        },
      })).data
      let dContent = content
      switch (env.MERGE_DYNAMIC_METHOD || 'append') {
        case 'append':
          dContent = dMerge + dContent
          break
        case 'prepend':
          dContent += dMerge
          break
        default:
          console.warn('[warn] Unknown dynamic merge method, returning static content')
          return res.send(content)
      }
      if (cache_count > 0 && cache_time > 0) {
        console.log(`Caching dynamic merge content (${req.originalUrl}) for ${cache_time} seconds`)
        cache[req.originalUrl] = {
          content: dContent,
          expires: Date.now() + cache_time * 1000
        }
        if (Object.keys(cache).length > cache_count) {
          Object
            .keys(cache)
            .sort((a, b) => cache[a].expires - cache[b].expires)
            .slice(0, Object.keys(cache).length - cache_count)
            .forEach(key => {
              delete cache[key]
            })
        }
      }
      return res.send(dContent)
    } catch (e) {
      console.warn('[warn] Failed to fetch dynamic merge content, returning static content')
      return res.send(content)
    }
  })
  
  app.listen(port, () => {
    console.log(`s.containers/http-single-file listening on port ${port}`)
  })
})()
