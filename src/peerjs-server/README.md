# `s.containers/peerjs-server`

### [Back to index](../../README.md)

## Why?

The PeerJS server is an essential component for establishing peer-to-peer connections in real-time web applications. This container provides a simple, configurable, and ready-to-use PeerServer instance. The original PeerJS server lacks env support and is not compatible with ARM architectures, which this container addresses.

## Environment Variables

| Name                          | Type   | Default Value                                              | Description                                                            |
|:------------------------------|:-------|:-----------------------------------------------------------|:-----------------------------------------------------------------------|
| `PORT`                        | int    | `9000`                                                     | The port the PeerServer will listen on.                                |
| `PEERJS_PATH`                 | string | `/`                                                        | The path for the PeerServer.                                           |
| `ALLOW_DISCOVERY`             | bool   | `false`                                                    | Allow discovery of PeerJS servers.                                     |
| `PROXIED`                     | bool   | `true`                                                     | Enable proxy support.                                                  |
| `CONCURRENT_LIMIT`            | int    | `5000`                                                     | The maximum number of concurrent connections.                          |
| `ALIVE_TIMEOUT`               | int    | `60000`                                                    | The timeout for a connection to be considered alive (in milliseconds). |
| `EXPIRE_TIMEOUT`              | int    | `60000`                                                    | The timeout for a peer to be expired (in milliseconds).                |
| `KEY`                         | string | `peerjs`                                                   | The key for the PeerServer.                                            |
| `CORS_ORIGIN`                 | string | `*`                                                        | The CORS origin.                                                       |
| `CORS_METHODS`                | list   | `["GET", "POST", "PUT", "DELETE", "OPTIONS"]`              | The allowed CORS methods.                                              |
| `CORS_ALLOWED_HEADERS`        | list   | `["Origin", "X-Requested-With", "Content-Type", "Accept"]` | The allowed CORS headers.                                              |
| `CORS_CREDENTIALS`            | bool   | `true`                                                     | Enable CORS credentials.                                               |
| `CORS_OPTIONS_SUCCESS_STATUS` | int    | `204`                                                      | The CORS options success status.                                       |
| `CORS_EXPOSED_HEADERS`        | list   | `[]`                                                       | The CORS exposed headers.                                              |
| `CORS_MAX_AGE`                | int    | `86400`                                                    | The CORS max age (in seconds).                                         |
| `CORS_PREFLIGHT_CONTINUE`     | bool   | `false`                                                    | Continue preflight requests.                                           |

## Example

```yml
service:
  app:
    image: ghcr.io/scolastico-dev/s.containers/peerjs-server:latest
    environment:
      KEY: mysecretkey
      PROXIED: false
    ports:
      - 9000:9000
    restart: unless-stopped
```
