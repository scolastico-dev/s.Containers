import express from 'express'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const CFG = {
  SIGNOZ_URL: process.env.SIGNOZ_URL,
  SIGNOZ_USER: process.env.SIGNOZ_USER,
  SIGNOZ_PASSWORD: process.env.SIGNOZ_PASSWORD,
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
  const url = new URL(CFG.SIGNOZ_URL)
  url.pathname = '/api/v1/login'
  const res = await axios.post(url.toString(), {
    email: CFG.SIGNOZ_USER,
    password: CFG.SIGNOZ_PASSWORD,
  })
  tokenCache = res.data
  return tokenCache
}

const app = express()

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(express.text({ limit: '50mb' }))
app.use(express.raw({ limit: '50mb' }))

const denyAccess = (_, res) => res.status(403).send(
  'Auth Proxy: Access denied for security reasons'
)

app.all('/api/v1/loginPrecheck', denyAccess)
app.all('/api/v1/invite', denyAccess)
app.all('/api/v1/invite/*', denyAccess)
app.all('/api/v1/getResetPasswordToken/*', denyAccess)
app.delete('/api/v1/user/*', denyAccess)
app.put('/api/v1/user/*', denyAccess)
app.post('/api/v1/user/*', denyAccess)
app.patch('/api/v1/user/*', denyAccess)

app.all('/api/v1/login', async (_, res) => res.send(await getToken()))

app.get('/main.*.js', async (req, res) => {
  const url = new URL(CFG.SIGNOZ_URL)
  url.pathname = req.path
  const token = await getToken();
  res
    .header('Content-Type', 'application/javascript')
    .header('Cache-Control', 'public, max-age=3600')
    .send(`
      window.localStorage.setItem('AUTH_TOKEN', '${token.accessJwt	}');
      window.localStorage.setItem('REFRESH_AUTH_TOKEN', '${token.refreshJwt}');
      window.localStorage.setItem('IS_LOGGED_IN', 'true');
      window.localStorage.setItem('IS_IDENTIFIED_USER', 'true');
      ${await axios.get(url.toString()).then(res => res.data)}
    `)
})

app.all('*', async (req, res) => {
  const url = new URL(CFG.SIGNOZ_URL)
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
        Authorization: 'Bearer ' + (await getToken()).accessJwt,
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
