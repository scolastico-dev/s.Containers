const WebSocket = require('ws');
const axios = require('axios');
const url = require('url');

const clientToken = process.env.CLIENT_TOKEN;
const serverUrl = process.env.SERVER_URL;
const localUrl = process.env.LOCAL_URL;
const altHost = process.env.ALTERNATIVE_HOST;
const allowCookieHost = process.env.ALLOW_ALTERNATIVE_COOKIE_HOST === 'true';
const printRequestError = process.env.PRINT_REQUEST_ERROR === 'true';
const timeout = parseInt(process.env.TIMEOUT || '10000');
const verbose = process.env.VERBOSE === 'true';
const debug = process.env.DEBUG === 'true' || verbose;

if (!clientToken || !serverUrl || !localUrl) {
  console.error('Please set the CLIENT_TOKEN, SERVER_URL and LOCAL_URL environment variables');
  process.exit(1);
}

const serverUrlWithToken = new url.URL(serverUrl);
serverUrlWithToken.searchParams.set('token', clientToken);

const ws = new WebSocket(serverUrlWithToken.href);

process.on('SIGINT', () => {
  try {
    ws.close();
  } catch (ignored) {}
  process.exit();
})

ws.on('open', () => {
  console.log('Connected to server');
});

ws.on('message', async (message) => {
  const request = JSON.parse(message);
  console.log(`Received request: ${request.id} ${request.ip} ${request.method} ${request.path}`);

  let xRelayHost = null;
  const cookieHeader = request.headers.cookie;

  if (allowCookieHost && cookieHeader) for (const cookie of cookieHeader.split('; ')) {
    if (cookie.startsWith('x-relay-host=')) {
      xRelayHost = cookie.split('=')[1];
      break;
    }
  };

  try {
    if (debug) console.log(`Making request to: ${localUrl}${request.path}`);
    if (verbose) console.log(`Request: ${JSON.stringify(request, null, 2)}`);
    const { data, status, headers } = await axios({
      method: request.method,
      url: `${localUrl}${request.path}`,
      headers: {
        ...request.headers,
        host: xRelayHost || altHost || new url.URL(localUrl).host,
      },
      data: request.body,
      params: request.query,
      maxRedirects: 0,
      timeout,
    });
    const response = {
      id: request.id,
      status,
      headers,
      body: data,
    };
    console.log(`Sending response: ${response.id} => ${response.status}`);
    ws.send(JSON.stringify(response));
  } catch (err) {
    const response = {
      id: request.id,
      status: err.response?.status || 500,
      headers: err.response?.headers || {},
      body: err.response?.data || err.message,
    };
    if (printRequestError) console.error('Error processing request:', err);
    console.log(`Sending response: ${response.id} => ${response.status}`);
    ws.send(JSON.stringify(response));
  }
});

ws.on('close', () => {
  console.log('Disconnected from server');
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});
