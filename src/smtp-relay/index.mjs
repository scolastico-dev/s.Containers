import { SMTPServer } from 'smtp-server'
import { createTransport } from 'nodemailer'
import { readFileSync, existsSync } from 'fs'
import { Buffer } from 'buffer'
import { PassThrough } from 'stream'
import dotenv from 'dotenv'
dotenv.config()

console.log("Starting SMTP Relay Server...")

const config = {
  send: {
    from: process.env.SEND_FROM || null,
    name: process.env.SEND_NAME || null,
    user: process.env.SEND_USER || null,
    pass: process.env.SEND_PASS || null,
    host: process.env.SEND_HOST || null,
    port: parseInt(process.env.SEND_PORT || '587', 10),
    secure: process.env.SEND_SECURE === 'true',
    noVerify: process.env.SEND_NO_VERIFY === 'true',
    pool: {
      enabled: (process.env.SEND_POOL_ENABLED || process.env.SEND_REUSE_CONNECTION) === 'true',
      maxConnections: parseInt(process.env.SEND_POOL_MAX_CONNECTIONS || '5', 10),
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
  accounts: new Map(),
}

if (!config.send.host || !config.send.from) {
  console.error("ERROR: SEND_HOST and SEND_FROM environment variables are required.")
  process.exit(1)
}

if (!config.send.user && config.send.pass) console.warn("WARN: SEND_PASS provided without SEND_USER. Authentication might fail.")
if (config.send.user && !config.send.pass) console.warn("WARN: SEND_USER provided without SEND_PASS. Authentication might fail.")

console.log("Loading accounts from environment variables...")
for (const key in process.env) {
  const userMatch = key.match(/^ACCOUNT_(.*)_USER$/)
  if (userMatch) {
    const id = userMatch[1]
    const user = process.env[key]
    const pass = process.env[`ACCOUNT_${id}_PASS`]
    const from = process.env[`ACCOUNT_${id}_FROM`]
    const name = process.env[`ACCOUNT_${id}_NAME`]
    if (config.accounts.has(user)) {
      console.warn(`WARN: Duplicate account found for ${user}. Skipping...`)
    } else if (user && pass) {
      config.accounts.set(user, { pass, from, name })
      console.log(` - Loaded account: ${user} (ID: ${id})`)
    } else {
      console.warn(`WARN: Found ACCOUNT_${id}_USER but missing or empty ACCOUNT_${id}_PASS.`)
    }
  }
}

if (config.accounts.size === 0) {
  console.warn("WARN: No accounts defined via ACCOUNT_<ID>_USER/PASS. The relay will accept unauthenticated connections.")
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
    console.log("TLS configured using RECEIVE_KEY and RECEIVE_CERT.")
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
    console.log("No TLS configuration provided for the receiving server (RECEIVE_KEY/CERT or RECEIVE_TRAEFIK_* not set). Server will run unencrypted.")
  }
} catch (error) {
  console.error("ERROR configuring TLS for receiving server:", error.message)
  console.error("Continuing without TLS for the receiving server.")
  tlsOptions = null
}

console.log(`Configuring outbound relay via ${config.send.host}:${config.send.port} (Secure: ${config.send.secure})`)
const transporterOptions = {
  host: config.send.host,
  port: config.send.port,
  secure: config.send.secure,
  pool: config.send.pool.enabled,
  maxConnections: config.send.pool.maxConnections,
  maxMessages: config.send.pool.maxMessages,
  auth: (config.send.user && config.send.pass) ? {
    user: config.send.user,
    pass: config.send.pass,
  } : undefined,
}
const transporter = createTransport(transporterOptions)

if (!config.send.noVerify) transporter.verify(error => {
  if (error) {
    console.error('ERROR connecting to outbound SMTP server:', error)
  } else {
    console.log('Successfully connected to outbound SMTP server.')
  }
})

const serverOptionsBase = {
  name: config.receive.host,
  banner: 'Welcome to SMTP Relay',
  authOptional: config.accounts.size === 0 ? true : undefined,
  authMethods: ['PLAIN', 'LOGIN'],
  onAuth(auth, session, callback) {
    if (config.accounts.size === 0) {
      console.log(`AUTH: Allowing unauthenticated access from ${session.remoteAddress} (no accounts configured)`)
      return callback(null, { user: auth.username || 'anonymous' })
    }
    if (!config.accounts.has(auth.username)) {
      console.warn(`AUTH: Failed login attempt for user "${auth.username}" from ${session.remoteAddress} - User not found`)
      return callback(new Error('Invalid username or password'))
    }
    const expectedPass = config.accounts.get(auth.username).pass
    if (auth.password !== expectedPass) {
      console.warn(`AUTH: Failed login attempt for user "${auth.username}" from ${session.remoteAddress} - Incorrect password`)
      return callback(new Error('Invalid username or password'))
    }
    console.log(`AUTH: Successful login for user "${auth.username}" from ${session.remoteAddress}`)
    callback(null, { user: auth.username })
  },
  onData(stream, session, callback) {
    let chunks = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('end', () => {
      let raw = Buffer.concat(chunks).toString('utf8')
      const user = config.accounts.get(session.user)
      const name = user.name || config.send.name
      const from = user.from || config.send.from
      raw = raw.replace(/^From: .+$/m, `From: ${from}`)
      const mailOptions = {
        envelope: {
          from: name ? `${name} <${from}>` : from,
          to: session.envelope.rcptTo.map(rcpt => rcpt.address),
        },
        raw,
      }
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error(`RELAY ERROR for ${session.id}: Failed to send email`, err)
          return callback(new Error(`Failed to relay message: ${err.message}`))
        }
        console.log(`RELAY SUCCESS for ${session.id}: ${info.response}`)
        callback(null, 'Message relayed successfully')
      })
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
    const secureMsg = options.secure ? '(Implicit TLS enabled)' : options.disabledCommands.includes('STARTTLS') ? '(STARTTLS disabled)' : '(STARTTLS enabled)'
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

console.log("SMTP Relay server setup complete. Waiting for connections...")
