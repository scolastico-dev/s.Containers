import express from 'express'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const CFG = {
  RABBITMQ_URL: process.env.RABBITMQ_URL,
  RABBITMQ_USER: process.env.RABBITMQ_USER || 'guest',
  RABBITMQ_PASSWORD: process.env.RABBITMQ_PASSWORD || 'guest',
}

let missingVar = false
for (const [key, value] of Object.entries(CFG)) if (!value) {
  console.error(`Missing environment variable: ${key}`)
  missingVar = true
}
if (missingVar) process.exit(1)

const app = express()

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(express.text({ limit: '50mb' }))
app.use(express.raw({ limit: '50mb' }))

app.get('/*.js', async (req, res) => {
  const url = new URL(CFG.RABBITMQ_URL)
  url.pathname = req.path
  res
    .header('Content-Type', 'application/javascript')
    .header('Cache-Control', 'public, max-age=3600')
    .send(`
      window.localStorage.setItem('rabbitmq.auth-scheme', 'Basic');
      window.localStorage.setItem('rabbitmq.credentials', '${Buffer.from(CFG.RABBITMQ_USER + ':' + CFG.RABBITMQ_PASSWORD).toString('base64')}');
      window.localStorage.setItem('rabbitmq.vhost', '');
      window.localStorage.setItem('rabbitmq.visible|exchange|Bindings', 't');
      window.localStorage.setItem('rabbitmq.visible|exchange|Delete this exchange', 't');
      window.localStorage.setItem('rabbitmq.visible|exchange|Publish message', 't');
      window.localStorage.setItem('rabbitmq.visible|queue|Get messages', 't');
      ${await axios.get(url.toString()).then(res => res.data)}
    `)
})

app.all('*', async (req, res) => {
  const url = new URL(CFG.RABBITMQ_URL)
  url.pathname = req.path
  for (const [key, value] of Object.entries(req.query)) {
    url.searchParams.append(key, value)
  }
  try {
    const { data, status, headers} = await axios({
      method: req.method,
      url: url.toString(),
      headers: {
        ...req.headers,
        Host: undefined,
        'If-None-Match': undefined,
        Authorization: `Basic ${Buffer.from(CFG.RABBITMQ_USER + ':' + CFG.RABBITMQ_PASSWORD).toString('base64')}`,
      },
      data: req.body,
      validateStatus: (status) => status !== 401 && status !== 403,
      responseType: 'arraybuffer',
    })
    res.header({
      ...headers,
      'Set-Cookie': 'm=59b9:true; path=/; expires=' + new Date(Date.now() + 1000 * 60 * 60 * 24).toUTCString(),
    }).status(status).send(data)
  } catch (error) {
    if (error.response) {
      await getToken(true)
      res.header({'Refresh': '1; url=/'}).send('Auth Proxy: Refreshing token, please wait...')
    } else {
      res.status(500).send('Auth Proxy: Internal server error')
      console.error(error)
    }
  }
})

app.listen(3000, () => {
  console.log('Auth Proxy: Listening on port 3000')
})
