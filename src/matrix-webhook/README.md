# `matrix-webhook-server`

### [Back to index](../../README.md)

## Why?

Matrix, being a powerful communication platform, lacks straightforward webhook support for integrating external services. This project provides a simple yet effective solution to bridge this gap, enabling users to send messages to Matrix rooms/channels directly via HTTP requests.

## Environment Variables

To configure the `matrix-webhook-server`, the following environment variables are available:

| Name              | Type   | Default Value | Description                                                     |
|-------------------|--------|---------------|-----------------------------------------------------------------|
| `SHARED_SECRET`   | string | `null`        | The shared secret key for authenticating incoming webhook calls.|
| `SERVER_URL`      | string | `null`        | The URL of the Matrix server to connect to.                     |
| `USERNAME`        | string | `null`        | The username of the Matrix account used to send messages.       |
| `PASSWORD`        | string | `null`        | The password for the Matrix account.                            |

## Example

Docker compose:

```yaml
version: "3"
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/matrix-webhook:latest
    ports:
      - "3000:3000"
    environment:
      - SHARED_SECRET=yourSharedSecret
      - SERVER_URL=https://matrix.org
      - USERNAME=@yourusername:matrix.org
      - PASSWORD=yourpassword
```

Trigger the webhook:

```bash
curl -X POST http://localhost:3000/!yourMatrixRoomId:matrix.org?key=yourSharedSecret \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello from the webhook!"}'
```
