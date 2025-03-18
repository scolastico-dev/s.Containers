import express from 'express'
import axios from 'axios'
import dotenv from 'dotenv'

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
  return tokenCache
}

const app = express()

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(express.text({ limit: '50mb' }))
app.use(express.raw({ limit: '50mb' }))

app.get('/login', async (req, res) => {
  res.redirect('/')
})

app.all('*', async (req, res) => {
  const url = new URL(CFG.MINIO_URL)
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
        Cookie: await getToken(),
      },
      data: req.body,
      validateStatus: (status) => status !== 401 && status !== 403,
      responseType: 'arraybuffer',
    })
    res.header(headers).status(status).send(data)
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
