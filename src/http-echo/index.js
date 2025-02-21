const express = require('express')
const app = express()
const port = 3000

app.all('*', (req, res) => {
  console.log(`Received request: ${req.method} ${req.url}`)
  res.setHeader('content-type', 'application/json')
  const str = JSON.stringify({
    headers: req.headers,
    query: req.query,
    body: req.body,
    method: req.method,
    url: req.url
  }, null, 2)
  if (process.env.LOG_REQUEST === 'true') console.log(str)
  res.send(str)
})

app.listen(port, () => {
  console.log(`s.containers/http-echo listening on port ${port}`)
})
