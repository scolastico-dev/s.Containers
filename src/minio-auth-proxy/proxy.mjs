import axios from 'axios'
import dotenv from 'dotenv'
import http from 'http'
import httpProxy from 'http-proxy'
import { WebSocket, WebSocketServer } from 'ws'

dotenv.config()

const CFG = {
  MINIO_URL: process.env.MINIO_URL,
  MINIO_USER: process.env.MINIO_USER,
  MINIO_PASSWORD: process.env.MINIO_PASSWORD,
}

let missingVar = false
for (const [key, value] of Object.entries(CFG)) if (!value) {
  console.error(`Missing environment variable: ${key}`)
  missingVar = true
}
if (missingVar) process.exit(1)

let tokenCache = null
const getToken = async (reset = false) => {
  if (tokenCache && !reset) return tokenCache
  const url = new URL(CFG.MINIO_URL)
  url.pathname = '/api/v1/login'
  const res = await axios.post(url.toString(), {
    accessKey: CFG.MINIO_USER,
    secretKey: CFG.MINIO_PASSWORD,
  })
  tokenCache = res.headers['set-cookie'];
  setTimeout(() => tokenCache = null, 10 * 60 * 1000)
  return tokenCache
}

const proxy = httpProxy.createProxyServer({
  target: CFG.MINIO_URL,
  ws: true,
  secure: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
  changeOrigin: true,
  preserveHeaderKeyCase: true,
})
const server = http.createServer(async (req, res) => {
  const token = await getToken();
  res.setHeader('Set-Cookie', token)
  if (req.url === '/login') {
    res.writeHead(302, { Location: '/' })
    res.end()
    return
  }
  proxy.web(req, res, {
    headers: {
      Cookie: token,
    },
  })
})

const wss = new WebSocketServer({ server })
wss.on('connection', async (ws, req) => {
  const url = new URL(CFG.MINIO_URL)
  if (url.protocol === 'https:') url.protocol = 'wss:'
  else url.protocol = 'ws:'
  url.pathname = req.url
  const ws2 = new WebSocket(url.toString(), {
    headers: {
      Cookie: await getToken(),
    },
  })
  const cache = []
  ws.on('message', data => {
    if (ws2.readyState === WebSocket.OPEN) ws2.send(data.toString())
    else cache.push(data.toString())
  })
  ws2.on('open', () => {
    console.log('open')
    for (const data of cache) ws2.send(data)
  })
  ws2.on('message', data => {
    ws.send(data.toString())
  })
  ws.on('close', () => {
    ws2.close()
  })
  ws2.on('close', () => {
    ws.close()
  })
  ws2.on('error', error => {
    console.error(error)
    ws.close()
  })
  ws.on('error', error => {
    console.error(error)
    ws2.close()
  })
  ws2.on('ping', data => {
    ws.ping(data)
  })
  ws2.on('pong', data => {
    ws.pong(data)
  })
  ws.on('ping', data => {
    ws2.ping(data)
  })
  ws.on('pong', data => {
    ws2.pong(data)
  })
})

server.listen(3000, () => {
  console.log('Auth Proxy: Listening on port 3000')
})
