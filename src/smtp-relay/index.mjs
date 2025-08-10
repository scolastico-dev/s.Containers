import { SMTPServer } from 'smtp-server'
import { createTransport } from 'nodemailer'
import { readFileSync, existsSync, promises as fsp } from 'fs'
import { Buffer } from 'buffer'
import dotenv from 'dotenv'
import path from 'path'
import crypto from 'crypto'

dotenv.config()

console.log('Starting SMTP Relay Server...')

const config = {
  send: {
    from: process.env.SEND_FROM || null,
    name: process.env.SEND_NAME || null,
    replyTo: process.env.SEND_REPLY_TO || null,
    user: process.env.SEND_USER || null,
    pass: process.env.SEND_PASS || null,
    host: process.env.SEND_HOST || null,
    port: parseInt(process.env.SEND_PORT || '587', 10),
    secure: process.env.SEND_SECURE === 'true',
    noVerify: process.env.SEND_NO_VERIFY === 'true',
    ehloName: process.env.SEND_EHLO_NAME || null,
    forceIPv4: process.env.SEND_FORCE_IPV4 === 'true',
    socketTimeoutMs: parseInt(process.env.SEND_SOCKET_TIMEOUT_MS || '30000', 10),
    connectionTimeoutMs: parseInt(process.env.SEND_CONNECTION_TIMEOUT_MS || '30000', 10),
    pool: {
      // default to enabled for better connection reuse unless explicitly disabled
      enabled: (process.env.SEND_POOL_ENABLED || process.env.SEND_REUSE_CONNECTION) === 'true' || !process.env.SEND_POOL_ENABLED,
      maxConnections: parseInt(process.env.SEND_POOL_MAX_CONNECTIONS || '1', 10),
      maxMessages: parseInt(process.env.SEND_POOL_MAX_MESSAGES || '100', 10),
    }
  },
  receive: {
    keyPath: process.env.RECEIVE_KEY || null,
    certPath: process.env.RECEIVE_CERT || null,
    traefik: {
      storePath: process.env.RECEIVE_TRAEFIK_KEY_STORE || null,
      rootKey: process.env.RECEIVE_TRAEFIK_ROOT_KEY || null,
    },
    host: process.env.RECEIVE_HOST || 'smtp.relay.local',
  },
  queue: {
    enabled: process.env.QUEUE_ENABLED === 'true',
    dir: process.env.QUEUE_DIR || '/data/mail-queue',
    workerIntervalMs: parseInt(process.env.QUEUE_WORKER_INTERVAL_MS || '2000', 10),
    retryBaseDelayMs: parseInt(process.env.QUEUE_RETRY_BASE_DELAY_MS || '2000', 10),
    retryMaxBackoffMs: parseInt(process.env.QUEUE_MAX_BACKOFF_MS || '600000', 10), // 10 min cap
    jitterMs: parseInt(process.env.QUEUE_JITTER_MS || '500', 10),
    attemptTimeoutMs: parseInt(process.env.QUEUE_ATTEMPT_TIMEOUT_MS || process.env.SEND_SOCKET_TIMEOUT_MS || '30000', 10),
  },
  accounts: new Map(),
}

if (!config.send.host || !config.send.from) {
  console.error('ERROR: SEND_HOST and SEND_FROM environment variables are required.')
  process.exit(1)
}

if (!config.send.user && config.send.pass) console.warn('WARN: SEND_PASS provided without SEND_USER. Authentication might fail.')
if (config.send.user && !config.send.pass) console.warn('WARN: SEND_USER provided without SEND_PASS. Authentication might fail.')

console.log('Loading accounts from environment variables...')
for (const key in process.env) {
  const userMatch = key.match(/^ACCOUNT_(.*)_USER$/)
  if (userMatch) {
    const id = userMatch[1]
    const user = process.env[key]
    const pass = process.env[`ACCOUNT_${id}_PASS`]
    const from = process.env[`ACCOUNT_${id}_FROM`]
    const name = process.env[`ACCOUNT_${id}_NAME`]
    const replyTo = process.env[`ACCOUNT_${id}_REPLY_TO`]
    if (config.accounts.has(user)) {
      console.warn(`WARN: Duplicate account found for ${user}. Skipping...`)
    } else if (user && pass) {
      config.accounts.set(user, { pass, from, name, replyTo })
      console.log(` - Loaded account: ${user} (ID: ${id})`)
    } else {
      console.warn(`WARN: Found ACCOUNT_${id}_USER but missing or empty ACCOUNT_${id}_PASS.`)
    }
  }
}

if (config.accounts.size === 0) {
  console.warn('WARN: No accounts defined via ACCOUNT_<ID>_USER/PASS. The relay will accept unauthenticated connections.')
} else {
  console.log(`Loaded ${config.accounts.size} account(s).`)
}

let tlsOptions = null
function b64Decode(data) {
  return Buffer.from(data, 'base64').toString('utf8')
}

try {
  if (config.receive.keyPath && config.receive.certPath) {
    console.log(`Loading TLS key from ${config.receive.keyPath} and cert from ${config.receive.certPath}`)
    if (!existsSync(config.receive.keyPath)) throw new Error(`Key file not found: ${config.receive.keyPath}`)
    if (!existsSync(config.receive.certPath)) throw new Error(`Certificate file not found: ${config.receive.certPath}`)
    tlsOptions = {
      key: readFileSync(config.receive.keyPath),
      cert: readFileSync(config.receive.certPath),
    }
    console.log('TLS configured using RECEIVE_KEY and RECEIVE_CERT.')
  } else if (config.receive.traefik.storePath && config.receive.traefik.rootKey) {
    console.log(`Loading TLS key/cert from Traefik store: ${config.receive.traefik.storePath} for domain: ${config.receive.traefik.rootKey}`)
    if (!existsSync(config.receive.traefik.storePath)) throw new Error(`Traefik store file not found: ${config.receive.traefik.storePath}`)
    const storeData = JSON.parse(readFileSync(config.receive.traefik.storePath, 'utf8'))
    const resolverKey = Object.keys(storeData)[0]
    if (!resolverKey || !storeData[resolverKey] || !storeData[resolverKey].Certificates)
      throw new Error('Invalid Traefik acme.json structure or no resolver found.')
    console.log(`Using resolver key from acme.json: ${resolverKey}`)
    const fullCert = storeData[resolverKey].Certificates.find(cert => cert.domain && cert.domain.main === config.receive.traefik.rootKey)
    if (!fullCert || !fullCert.key || !fullCert.certificate)
      throw new Error(`Certificate for domain '${config.receive.traefik.rootKey}' not found in Traefik store.`)
    tlsOptions = {
      key: b64Decode(fullCert.key),
      cert: b64Decode(fullCert.certificate),
    }
    console.log(`TLS configured using Traefik store for domain ${config.receive.traefik.rootKey}.`)
  } else {
    console.log('No TLS configuration provided for the receiving server (RECEIVE_KEY/CERT or RECEIVE_TRAEFIK_* not set). Server will run unencrypted.')
  }
} catch (error) {
  console.error('ERROR configuring TLS for receiving server:', error.message)
  console.error('Continuing without TLS for the receiving server.')
  tlsOptions = null
}

console.log(`Configuring outbound relay via ${config.send.host}:${config.send.port} (Secure: ${config.send.secure})`)
const transporterOptions = {
  host: config.send.host,
  port: config.send.port,
  secure: config.send.secure,
  // prefer connection reuse with a very small pool
  pool: config.send.pool.enabled,
  maxConnections: config.send.pool.maxConnections,
  maxMessages: config.send.pool.maxMessages,
  // use a stable EHLO name if provided
  name: config.send.ehloName || undefined,
  auth: (config.send.user && config.send.pass) ? {
    user: config.send.user,
    pass: config.send.pass,
  } : undefined,
  tls: {
    minVersion: 'TLSv1.2',
    // allow forcing IPv4 by disabling SNI DNS family resolution oddities
    // nodemailer does not expose family directly, but we can hint via hostnames and system resolver
  },
  socketTimeout: config.send.socketTimeoutMs,
  connectionTimeout: config.send.connectionTimeoutMs,
}
const transporter = createTransport(transporterOptions)

if (!config.send.noVerify) transporter.verify(error => {
  if (error) {
    console.error('ERROR connecting to outbound SMTP server:', error)
  } else {
    console.log('Successfully connected to outbound SMTP server.')
  }
})

/* ---------------------------
   Simple file queue utilities
---------------------------- */

const QUEUE_EXT = '.json'
const PROCESSING_EXT = '.sending'

async function ensureQueueDir() {
  if (!config.queue.enabled) return
  await fsp.mkdir(config.queue.dir, { recursive: true })
}

function queueFileName() {
  const ts = Date.now()
  const id = crypto.randomUUID()
  return `${ts}-${id}${QUEUE_EXT}`
}

async function writeQueueItem({ envelope, raw, meta = {} }) {
  const filePath = path.join(config.queue.dir, queueFileName())
  const item = {
    version: 1,
    createdAt: Date.now(),
    nextAttemptAt: meta.nextAttemptAt || Date.now(),
    attempts: meta.attempts || 0,
    lastError: meta.lastError || null,
    envelope,
    raw,
  }
  await fsp.writeFile(filePath, JSON.stringify(item), 'utf8')
  return filePath
}

function backoffDelay(attempts) {
  const base = config.queue.retryBaseDelayMs
  const cap = config.queue.retryMaxBackoffMs
  // exponential with cap
  let delay = Math.min(cap, base * Math.pow(2, Math.max(0, attempts - 1)))
  // add small jitter
  const jitter = Math.floor(Math.random() * config.queue.jitterMs)
  return delay + jitter
}

async function listReadyQueueItems() {
  const files = await fsp.readdir(config.queue.dir)
  const now = Date.now()
  const ready = []
  for (const f of files) {
    if (!f.endsWith(QUEUE_EXT)) continue
    const full = path.join(config.queue.dir, f)
    try {
      const data = JSON.parse(await fsp.readFile(full, 'utf8'))
      if ((data.nextAttemptAt || 0) <= now) ready.push({ file: full, data })
    } catch (e) {
      console.warn('WARN: Failed to parse queue item, will skip:', full, e.message)
    }
  }
  // process oldest first
  ready.sort((a, b) => (a.data.createdAt || 0) - (b.data.createdAt || 0))
  return ready
}

// atomic lock by rename to .sending
async function lockItem(file) {
  const locked = file.replace(QUEUE_EXT, PROCESSING_EXT)
  await fsp.rename(file, locked)
  return locked
}
// unlock by rename back to .json
async function unlockItem(lockedFile) {
  const unlocked = lockedFile.replace(PROCESSING_EXT, QUEUE_EXT)
  await fsp.rename(lockedFile, unlocked)
  return unlocked
}
// remove permanently
async function removeItem(lockedFileOrJson) {
  await fsp.unlink(lockedFileOrJson)
}

function attemptTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`send attempt timed out after ${ms} ms`)), ms)
    promise.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

async function sendRawMailWithTimeout({ envelope, raw }) {
  const mailOptions = { envelope, raw }
  // attempt-level timeout in addition to nodemailer socket timeouts
  return attemptTimeout(new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) return reject(err)
      resolve(info)
    })
  }), config.queue.attemptTimeoutMs)
}

async function processQueueItem(lockedFile, data) {
  try {
    const info = await sendRawMailWithTimeout({
      envelope: data.envelope,
      raw: data.raw,
    })
    console.log(`QUEUE SEND SUCCESS: ${path.basename(lockedFile)} -> ${info.response}`)
    await removeItem(lockedFile)
  } catch (err) {
    const attempts = (data.attempts || 0) + 1
    const delay = backoffDelay(attempts)
    data.attempts = attempts
    data.lastError = `${new Date().toISOString()} - ${err.message || String(err)}`
    data.nextAttemptAt = Date.now() + delay
    // write back and unlock
    const jsonFile = lockedFile.replace(PROCESSING_EXT, QUEUE_EXT)
    await fsp.writeFile(jsonFile, JSON.stringify(data), 'utf8')
    await removeItem(lockedFile).catch(() => {}) // locked file might have been replaced by writeFile path
    console.warn(`QUEUE SEND FAIL: ${path.basename(jsonFile)} attempt ${attempts}, next try in ~${Math.round(delay/1000)}s - ${err.message}`)
  }
}

let workerTimer = null
async function queueWorkerTick() {
  try {
    const items = await listReadyQueueItems()
    for (const item of items) {
      let locked = null
      try {
        locked = await lockItem(item.file)
      } catch {
        // another worker tick grabbed it
        continue
      }
      try {
        await processQueueItem(locked, item.data)
      } catch (e) {
        // if processing throws outside of send, try to unlock item safely
        try { await unlockItem(locked) } catch {}
        console.error('Worker processing error:', e)
      }
    }
  } catch (e) {
    console.error('Worker tick error:', e)
  }
}

async function startQueueWorker() {
  if (!config.queue.enabled) return
  await ensureQueueDir()
  console.log(`Email queue enabled at ${config.queue.dir}. Worker interval ${config.queue.workerIntervalMs} ms.`)
  workerTimer = setInterval(queueWorkerTick, config.queue.workerIntervalMs)
}

function stopQueueWorker() {
  if (workerTimer) clearInterval(workerTimer)
}

/* ---------------------------
   SMTP server options
---------------------------- */

const serverOptionsBase = {
  name: config.send.ehloName || config.receive.host,
  banner: 'Welcome to SMTP Relay',
  authOptional: config.accounts.size === 0 ? true : undefined,
  authMethods: ['PLAIN', 'LOGIN'],
  onAuth(auth, session, callback) {
    if (config.accounts.size === 0) {
      console.log(`AUTH: Allowing unauthenticated access from ${session.remoteAddress} (no accounts configured) (session: ${session.id})`)
      return callback(null, { user: auth.username || 'anonymous' })
    }
    if (!config.accounts.has(auth.username)) {
      console.warn(`AUTH: Failed login attempt for user "${auth.username}" from ${session.remoteAddress} - User not found (session: ${session.id})`)
      return callback(new Error('Invalid username or password'))
    }
    const expectedPass = config.accounts.get(auth.username).pass
    if (auth.password !== expectedPass) {
      console.warn(`AUTH: Failed login attempt for user "${auth.username}" from ${session.remoteAddress} - Incorrect password (session: ${session.id})`)
      return callback(new Error('Invalid username or password'))
    }
    console.log(`AUTH: Successful login for user "${auth.username}" from ${session.remoteAddress} (session: ${session.id})`)
    callback(null, { user: auth.username })
  },
  onData(stream, session, callback) {
    let chunks = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('end', async () => {
      let raw = Buffer.concat(chunks).toString('utf8')
      const user = config.accounts.get(session.user) || {}
      const name = user.name || config.send.name
      const from = user.from || config.send.from
      const fullFrom = name ? `${name} <${from}>` : from
      raw = raw.replace(/^From: .+$/m, `From: ${fullFrom}`)
      raw = raw.replace(/^Reply-To: .+$/m, `Reply-To: ${user.replyTo || config.send.replyTo || from}`)
      if (!raw.match(/^Reply-To: /m)) raw = `Reply-To: ${user.replyTo || config.send.replyTo || from}\n${raw}`
      const envelope = {
        from: fullFrom,
        to: session.envelope.rcptTo.map(rcpt => rcpt.address),
      }

      if (config.queue.enabled) {
        try {
          await writeQueueItem({ envelope, raw })
          console.log(`ENQUEUED message from session ${session.id}`)
          callback(null, 'Message queued for delivery')
        } catch (e) {
          console.error(`QUEUE WRITE ERROR for ${session.id}:`, e)
          callback(new Error(`Failed to queue message: ${e.message}`))
        }
      } else {
        // immediate send with retry inside queue-like function
        try {
          const info = await sendRawMailWithTimeout({ envelope, raw })
          console.log(`RELAY SUCCESS for ${session.id}: ${info.response}`)
          callback(null, 'Message relayed successfully')
        } catch (err) {
          console.error(`RELAY ERROR for ${session.id}:`, err)
          callback(new Error(`Failed to relay message: ${err.message}`))
        }
      }
    })
    stream.on('error', err => {
      console.error(`MAIL ERROR for ${session.id}:`, err)
    })
  },
  onConnect(session, callback) {
    console.log(`CONNECT: Connection from ${session.remoteAddress} (Session: ${session.id})`)
    callback()
  },
  onMailFrom(address, session, callback) {
    console.log(`MAIL FROM: ${address.address} (Session: ${session.id})`)
    callback()
  },
  onRcptTo(address, session, callback) {
    console.log(`RCPT TO: ${address.address} (Session: ${session.id})`)
    callback()
  },
  onClose(session) {
    console.log(`CLOSE: Connection closed for session ${session.id}`)
  },
  onError(err) {
    console.error('SERVER ERROR:', err)
  }
}

function startServer(port, options) {
  const server = new SMTPServer(options)
  server.listen(port, () => {
    const secureMsg = options.secure ? '(Implicit TLS enabled)' : options.disabledCommands?.includes('STARTTLS') ? '(STARTTLS disabled)' : '(STARTTLS enabled)'
    console.log(`SMTP Relay listening on port ${port} ${secureMsg}`)
  })
  return server
}

const servers = [
  startServer(25, { ...serverOptionsBase, disabledCommands: ['STARTTLS'], allowInsecureAuth: true }),
  startServer(587, { ...serverOptionsBase, secure: false, ...(tlsOptions || {}) }),
]

if (tlsOptions) {
  servers.push(startServer(465, { ...serverOptionsBase, secure: true, ...tlsOptions }))
} else {
  console.log('Port 465 (SMTPS) is disabled because TLS is not configured.')
}

const shutdown = signal => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`)
  stopQueueWorker()
  let closed = 0
  servers.forEach(srv => {
    srv.close(() => {
      closed++
      if (closed === servers.length) {
        console.log('All SMTP servers closed.')
        transporter.close()
        console.log('Nodemailer transporter resources released (if any).')
        process.exit(0)
      }
    })
  })
  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing exit.')
    process.exit(1)
  }, 10000)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

await startQueueWorker()

console.log('SMTP Relay server setup complete. Waiting for connections...')
