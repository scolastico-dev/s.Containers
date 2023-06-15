const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const url = require('url');

let currentClient = null;
const requestQueue = {};
const clientToken = process.env.CLIENT_TOKEN || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const serverPort = process.env.SERVER_PORT || 3000;

console.log('Client token: ' + clientToken);

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, verifyClient: (info, done) => {
  const parsedUrl = url.parse(info.req.url, true);
  const token = parsedUrl.query.token;
  if (token !== clientToken) return done(false, 401, 'Unauthorized: Invalid token');
  if (currentClient) return done(false, 409, 'Conflict: Client already connected');
  done(true);
}});

process.on('SIGINT', () => {
  try {
    app.close();
    server.close();
    wss.close();
  } catch (ignored) {}
  process.exit();
})

wss.on('connection', (ws) => {
  console.log('Client connected');
  currentClient = ws;

  ws.on('close', () => {
    console.log('Client disconnected');
    for (const id in requestQueue) {
      const request = requestQueue[id];
      delete requestQueue[id];
      request.res.status(500).send('Server error: Client disconnected');
    }
    currentClient = null;
  });

  ws.on('message', (message) => {
    try {
      const response = JSON.parse(message);
      const request = requestQueue[response.id];
      if (!request) return;
      delete requestQueue[response.id];
      request.res.status(response.status).set(response.headers).send(response.body);
    } catch (e) {
      console.error(e);
    }
  });
});

app.all('*', async (req, res) => {
  if (!currentClient) return res.status(500).send('Server error: No client connected');
  const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const request = {id, method: req.method, path: req.path, headers: req.headers, body: req.body};
  currentClient.send(JSON.stringify(request));
  requestQueue[id] = {res};
  while (requestQueue[id]) await new Promise((resolve) => setTimeout(resolve, 10));
});

server.listen(serverPort, () => {
  console.log(`Server listening on port ${serverPort}`);
});
