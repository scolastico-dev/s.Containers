# `s.containers/web-term-wrapper`

### [Back to index](../../README.md)

## Why?

Start terminal applications in your browser with ease.

This container is not intended to be used by itself, it is intended to be used as a base image for other containers.

## Environment Variables

| Name                                  | Type   | Default Value         | Description                                     |
| ------------------------------------- | ------ | --------------------- | ----------------------------------------------- |
| `COMMAND`                             | string | `null`                | The command to execute                          |
| `DYNAMIC_SESSIONS`                    | bool   | `false`               | Start for each session a private shell session. |
| `MAX_CACHE_SIZE`                      | int    | `10485760`            | The maximum cache size in bytes.                |

## Example

```yml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/web-term-wrapper:latest
    ports:
      - "3000:3000"
    restart: unless-stopped
    environment:
      COMMAND: "echo 'Hello World!' && sleep 10"
```
