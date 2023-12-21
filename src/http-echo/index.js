const express = require('express')
const app = express()
const port = 3000

app.all('*', (req, res) => {
  console.log(`Received request: ${req.method} ${req.url}`)
  res.setHeader('content-type', 'application/json')
  res.send(JSON.stringify({
    headers: req.headers,
    query: req.query,
    body: req.body,
    method: req.method,
    url: req.url
  }, null, 2))
})

app.listen(port, () => {
  console.log(`s.containers/http-echo listening on port ${port}`)
})
