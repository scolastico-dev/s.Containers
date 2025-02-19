# `s.containers/web-term-otel-tui`

### [Back to index](../../README.md)

## Why?

A wrapper for the [ymtdzz/otel-tui](https://github.com/ymtdzzz/otel-tui) to run it in a web terminal.

## Environment Variables

| Name                                  | Type   | Default Value         | Description                                       |
| ------------------------------------- | ------ | --------------------- | ------------------------------------------------- |
| `MAX_CACHE_SIZE`                      | int    | `10485760`            | The maximum cache size in bytes for the terminal. |

## Example

```yml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/web-term-otel-tui:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "4317:4317"
      - "4318:4318"
```
