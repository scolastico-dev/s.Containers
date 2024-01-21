import Imap from 'imap'
import Axios from 'axios'
import NodeMailer from 'nodemailer'
import { FormData, File } from 'formdata-node'
import { scheduleJob } from 'node-schedule'
import { simpleParser } from 'mailparser'

// current job promise (if any), for graceful shutdown
let currentJob = null;

// handle SIGINT and SIGTERM
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log(`Received ${signal}, exiting`)
    if (currentJob) {
      console.log('Waiting for current job to finish...')
      await currentJob;
      console.log('Job finished, exiting')
    }
    process.exit(0)
  })
}

// read environment variables
const env = process.env
const cfg = {
  imap: {
    host: env.IMAP_HOST,
    port: Number(env.IMAP_PORT || 993),
    user: env.IMAP_USER,
    password: env.IMAP_PASSWORD,
    tls: env.IMAP_TLS !== 'false',
    ...(env.IMAP_TRUST_TLS === 'true' ? {
      tlsOptions: {
        checkServerIdentity: () => undefined,
      },
    } : {})
  },
  smtp: {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_TLS !== 'false',
    ...(env.SMTP_TRUST_TLS === 'true' ? {
      tls: {
        rejectUnauthorized: false,
      },
    } : {}),
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  },
  input: Object
    .keys(env)
    .filter(key => key.startsWith('INPUT_') && key.endsWith('_MAIL'))
    .map(key => key.replace(/^INPUT_(.*)_MAIL$/, '$1'))
    .map(key => ({
      key,
      mail: env[`INPUT_${key}_MAIL`],
      mode: env[`INPUT_${key}_MODE`] || 'just-upload',
    })),
  lexofficeKey: env.LEXOFFICE_KEY,
  scheduler: env.SCHEDULER || '0 */3 * * *',
  redirectUnparsable: env.REDIRECT_UNPARSABLE,
}

console.log('Read config:')
console.log(JSON.stringify(cfg, null, 2) + '\n')

// validate
const inputMailSet = new Set()
for (const i of cfg.input) {
  const e = `Invalid input "${i.key}": `
  if (!['just-upload'].includes(i.mode)) throw new Error(e + 'invalid mode')
  if (inputMailSet.has(i.mail)) throw new Error(e + 'duplicate mail')
  inputMailSet.add(i.mail)
}

// handle errors
const handleErr = async err => {
  console.error(err)
  process.exit(1)
}

// redirect unparsable mails
const redirectUnparsable = async (mail, id) => {
  if (!cfg.redirectUnparsable) return;
  if (!cfg.smtp.host) throw new Error('Cannot redirect unparsable mails: SMTP host not configured')
  console.log(`Redirecting mail ${id} to "${cfg.redirectUnparsable}"...`)
  const transporter = NodeMailer.createTransport(cfg.smtp)
  await transporter.sendMail({
    from: `"Invoices Auto Import" <${cfg.smtp.user}>`,
    to: cfg.redirectUnparsable,
    subject: `Invoices - Unparsable mail: ${id}`,
    text: 'Hello, this is your invoices bot. I was unable to parse the email in the attachments. Please check it manually.',
    attachments: [
      {
        filename: 'mail.eml',
        content: String(mail),
      }
    ]
  })
  transporter.close()
  return true;
}

// job function
const jobFunction = async () => {
  console.log('Starting job at ' + new Date().toISOString())
  const imap = new Imap(cfg.imap)
  console.log('Registering error handler...')
  imap.once('error', handleErr)
  console.log('Connecting to IMAP server...')
  const readyPromise = new Promise(resolve => imap.once('ready', resolve))
  imap.connect()
  await readyPromise
  console.log('Opening INBOX...')
  await new Promise(resolve => imap.openBox('INBOX', false, (err, box) => {
    if (err) handleErr(err);
    resolve(box)
  }))
  console.log('Fetching unseen mails...')
  const unseen = await new Promise(resolve => imap.search(['UNSEEN'], (err, results) => {
    if (err) handleErr(err);
    resolve(results)
  }))
  console.log(`Found ${unseen.length} unseen mails`)
  for (const uid of unseen) {
    console.log(`Fetching mail ${uid}...`)
    const mail = await new Promise((resolve, reject) => {
      const f = imap.fetch(uid, { bodies: '' })
      f.once('error', reject)
      f.once('message', msg => {
        msg.once('body', stream => {
          let buffer = ''
          stream.on('data', chunk => buffer += chunk.toString('utf8'))
          stream.once('end', () => resolve(buffer))
        })
      })
    })
    console.log(`Parsing mail ${uid}...`)
    const parsed = await simpleParser(mail)
    const pdf = parsed.attachments.find(a => a.contentType === 'application/pdf')
    if (!pdf) {
      console.log(`No PDF found in mail ${uid}, skipping...`)
      if (await redirectUnparsable(mail, uid)) {
        console.log(`Marking mail ${uid} as seen...`)
        await new Promise(resolve => imap.addFlags(uid, '\\Seen', resolve))
      }
      continue;
    }
    const sender = parsed.from.value[0].address
    console.log(`Processing mail ${uid} from "${sender}"...`)
    let found = false;
    for (const i of cfg.input) {
      const emailCheck = String(i.mail).split('*')
      if (emailCheck.length === 2 && !(sender.startsWith(emailCheck[0]) && sender.endsWith(emailCheck[1]))) continue;
      else if (sender !== i.mail) continue;
      found = true;
      console.log(`Processing mail ${uid} for input "${i.key}"...`)
      switch (i.mode) {
        case 'just-upload':
          console.log(`Uploading PDF from mail ${uid} to input "${i.key}"...`)
          const data = new FormData()
          data.append('file', new File([pdf.content], pdf.filename))
          data.append('type', 'voucher')
          await Axios({
            method: 'POST',
            url: 'https://api.lexoffice.io/v1/files',
            headers: {
              Authorization: `Bearer ${cfg.lexofficeKey}`,
              'Content-Type': 'multipart/form-data',
              'Accept': 'application/json',
            },
            data,
          }).catch(err => {
            console.error(err.response.data)
            throw new Error(`Failed to upload PDF from mail ${uid} to input "${i.key}": ${err.response.status}`)
          })
          break
        default:
          throw new Error(`Invalid mode "${i.mode}"`)
      }
      console.log(`Marking mail ${uid} as seen...`)
      await new Promise(resolve => imap.addFlags(uid, '\\Seen', resolve))
    }
    if (!found) {
      console.log(`No input found for mail ${uid}, skipping...`)
      if (await redirectUnparsable(mail, uid)) {
        console.log(`Marking mail ${uid} as seen...`)
        await new Promise(resolve => imap.addFlags(uid, '\\Seen', resolve))
      }
    }
  }
  console.log('Disconnecting from IMAP server...')
  await new Promise(resolve => imap.closeBox(resolve))
  console.log('Job finished at ' + new Date().toISOString())
  if (cfg.scheduler === 'now') {
    console.log('Exiting...')
    process.exit(0)
  }
};


// run once or setup schedule
if (cfg.scheduler === 'now') {
  currentJob = jobFunction();
} else {
  console.log('Setting up schedule...')
  scheduleJob(cfg.scheduler, () => currentJob = jobFunction());
}
