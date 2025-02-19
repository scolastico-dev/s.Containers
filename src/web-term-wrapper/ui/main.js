import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { io } from 'socket.io-client'
import 'xterm/css/xterm.css'

const socket = io()
const term = new Terminal()

const el = document.createElement('div')
el.style.minWidth = '100vw'
el.style.minHeight = '100vh'
document.body.appendChild(el)

const fit = new FitAddon()
term.loadAddon(fit)
term.open(el)
fit.fit()

setInterval(() => {
  fit.fit()
  socket.emit('resize', { cols: term.cols, rows: term.rows })
}, 1000)

socket.on('output', data => term.write(data))
term.onData(data => socket.emit('input', data))
