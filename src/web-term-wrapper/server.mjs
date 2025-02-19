import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'
import pty from 'node-pty'

const command = process.env.COMMAND
if (!command) {
  console.error('COMMAND environment variable is required')
  process.exit(1)
}

const dynamicSessions = process.env.DYNAMIC_SESSIONS === 'true'
const maxCacheSize = parseInt(process.env.MAX_CACHE_SIZE) || 1024 * 1024 * 10 // 10MB

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const server = createServer(app)
const io = new Server(server)

app.use(express.static(path.join(__dirname, 'ui', 'dist')))

if (!dynamicSessions) {
  let child
  let outputCache = ''
  let controllerSocket = null
  function setupChild () {
    child = pty.spawn('sh', ['-c', command], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env
    })
    child.on('data', data => {
      outputCache += data
      if (outputCache.length > maxCacheSize) {
        outputCache = outputCache.slice(outputCache.length - maxCacheSize)
      }
      io.emit('output', data)
    })
    child.on('exit', code => {
      io.emit('output', `child process exited with code ${code}\r\nRestarting child process...\r\n`)
      console.log(`child process exited with code ${code}`)
      console.log('Restarting child process...')
      setupChild()
    })
  }
  setupChild()
  io.on('connection', socket => {
    if (!controllerSocket) controllerSocket = socket
    if (outputCache) socket.emit('output', outputCache)
    socket.on('input', data => child.write(data))
    socket.on('resize', ({ cols, rows }) => {
      if (socket === controllerSocket) child.resize(cols, rows)
    })
    socket.on('disconnect', () => {
      if (socket === controllerSocket) {
        const sockets = Array.from(io.sockets.sockets.values())
        controllerSocket = sockets.length ? sockets[0] : null
      }
    })
  })
} else {
  io.on('connection', socket => {
    const child = pty.spawn('sh', ['-c', command], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env
    })
    socket.on('input', data => child.write(data))
    socket.on('resize', ({ cols, rows }) => child.resize(cols, rows))
    child.on('data', data => socket.emit('output', data))
    child.on('exit', code => {
      socket.emit('output', `child process exited with code ${code}\r\n`)
      socket.disconnect(true)
    })
    socket.on('disconnect', () => {
      try { child.kill() } catch (e) {}
    })
  })
}

server.listen(3000, () => console.log('Server running on http://localhost:3000'))
