# `s.containers/web-cfg-editor`

### [Back to index](../../README.md)

## Why?

Easily edit config files in a web interface without much extra effort. Slim design by default.

## Environment Variables

| Name           | Type   | Default Value | Description                                                                                                                    |
|----------------|--------|---------------|--------------------------------------------------------------------------------------------------------------------------------|
| `USER_` + name | string | `null`        | To protect the interface an simple login mask can be displayed if this setting is set. Value needs to be in the ARGON2 format. |
| `PATHS`        | string | `null`        | An comma separated list of GLOB paths to the config files.                                                                     |
| `INSECURE`     | bool   | `false`       | If set to true the will be created without the secure flag.                                                                    |

*Tip: You can use the demo of the [argon2-browser](https://antelle.net/argon2-browser/) package to generate securely (on the client side) a hash for the `USER_` environment variable.*

## Ports

| Port | Description       |
|------|-------------------|
| 3000 | The web interface |

## Example

```yaml
version: "3"
services:
  editor:
    image: ghcr.io/scolastico-dev/s.containers/web-cfg-editor:latest
    volumes:
      - ./config:/config
    environment:
      - USER_admin=$argon2id$v=19$m=4096,t=3,p=1$PzOv6FpU1z+U6wB4Ylq3Gg$XjZB4N4WgR8o0TQc7/0JwQ
      - PATHS=/config/*.json,/config/*.yml
    ports:
      - '3000:3000'
```
