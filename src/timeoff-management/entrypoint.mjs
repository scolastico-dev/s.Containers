import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { spawnSync } from 'child_process'

const dbFile = 'src/config/db.json'
const dbContent = JSON.parse(readFileSync(dbFile, 'utf8'))
dbContent.development.storage = '/app/db/database.sqlite'
writeFileSync(dbFile, JSON.stringify(dbContent, null, 2), 'utf8')
if (!existsSync('/app/db')) mkdirSync('/app/db')

const file = 'src/config/app.json'
const content = JSON.parse(readFileSync(file, 'utf8'))

if (process.env.ALLOW_CREATE_NEW_ACCOUNTS) content.allow_create_new_accounts = process.env.ALLOW_CREATE_NEW_ACCOUNTS.toLowerCase() === 'true'
if (process.env.SEND_EMAILS) content.send_emails = process.env.SEND_EMAILS.toLowerCase() === 'true'
if (process.env.APPLICATION_SENDER_EMAIL) content.application_sender_email = process.env.APPLICATION_SENDER_EMAIL
if (process.env.EMAIL_TRANSPORTER_HOST) content.email_transporter.host = process.env.EMAIL_TRANSPORTER_HOST
if (process.env.EMAIL_TRANSPORTER_PORT) content.email_transporter.port = parseInt(process.env.EMAIL_TRANSPORTER_PORT, 10)
if (process.env.EMAIL_TRANSPORTER_AUTH_USER) content.email_transporter.auth.user = process.env.EMAIL_TRANSPORTER_AUTH_USER
if (process.env.EMAIL_TRANSPORTER_AUTH_PASS) content.email_transporter.auth.pass = process.env.EMAIL_TRANSPORTER_AUTH_PASS
if (process.env.GA_ANALYTICS_ON) content.ga_analytics_on = process.env.GA_ANALYTICS_ON.toLowerCase() === 'true'
if (process.env.APPLICATION_DOMAIN) content.application_domain = process.env.APPLICATION_DOMAIN
if (process.env.PROMOTION_WEBSITE_DOMAIN) content.promotion_website_domain = process.env.PROMOTION_WEBSITE_DOMAIN
if (process.env.LOCALE_CODE_FOR_SORTING) content.locale_code_for_sorting = process.env.LOCALE_CODE_FOR_SORTING
if (process.env.FORCE_TO_EXPLICITLY_SELECT_TYPE_WHEN_REQUESTING_NEW_LEAVE) content.force_to_explicitly_select_type_when_requesting_new_leave = process.env.FORCE_TO_EXPLICITLY_SELECT_TYPE_WHEN_REQUESTING_NEW_LEAVE.toLowerCase() === 'true'

writeFileSync(file, JSON.stringify(content, null, 2), 'utf8')
spawnSync('npm', ['start'], { stdio: 'inherit', cwd: process.cwd() + '/src' })
