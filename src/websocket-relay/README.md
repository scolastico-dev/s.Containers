# `s.containers/http-echo`
### [Back to index](../../README.md)

## Why?
The WebSocket Relay is a container that functions similarly to ngrok, making it ideal for forwarding local
pages to a publicly accessible server. It acts as an intermediary between a WebSocket server and an HTTP
client, allowing HTTP requests to be relayed over a WebSocket connection and vice versa. When an incoming
HTTP request is received, the container converts it into a WebSocket message and forwards it to the WebSocket
server. It also handles the response from the WebSocket server, converting it back into an HTTP response.
By using the WebSocket Relay, you can seamlessly incorporate WebSocket communication into your application
without the need to modify the existing architecture.

## Drawbacks
This is a fairly simple implementation of a WebSocket relay, and it is not intended for use in production
environments. It is not designed to handle a large number of concurrent connections, and it does not
support SSL (although it can be used in conjunction with a reverse proxy to provide SSL termination).

As we use websockets for the background communication, we can't forward websocket connections.

## Environment Variables

### Server
| Name                       | Type    | Default Value | Description                                                    |
|----------------------------|---------|---------------|----------------------------------------------------------------|
| `SERVER_TOKEN`             | string  | random        | The token to use for client authentication.                    |
| `PORT`                     | number  | `3000`        | The port to bind to.                                           |

### Client
| Name                       | Type    | Default Value | Description                                                    |
|----------------------------|---------|---------------|----------------------------------------------------------------|
| `SERVER_URL`               | string  | `null`        | The URL of the WebSocket server to connect to.                 |
| `CLIENT_TOKEN`             | string  | `null`        | The token to use for server authentication.                    |
| `LOCAL_URL`                | string  | `null`        | The URL of the local server to forward requests to.            |
| `PRINT_REQUEST_ERRORS`     | boolean | `false`       | Whether to print errors when a request fails.                  |

## Example

Deploy this on your server:

```yaml
version: "3"
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/websocket-relay:latest
    command: ["server.js"]
    ports:
      - "3000:3000"
    environment:
      CLIENT_TOKEN: YourSecretToken
```

And run this on your local machine:

```bash
docker run --rm --name websocket-relay \
  -e SERVER_URL=ws://your-server:3000 \
  -e SERVER_TOKEN=YourSecretToken \
  -e LOCAL_URL  http://localhost:3000 \
  ghcr.io/scolastico-dev/s.containers/websocket-relay:latest
```
