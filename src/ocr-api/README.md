# `s.containers/ocr-api`

### [Back to index](../../README.md)

## Why?

Send pdf, png or jpg file to an OCR API and get either text or a PDF with the text overlayed on the original file back.

## Environment Variables

| Name                                  | Type   | Default Value         | Description                                                                |
| ------------------------------------- | ------ | --------------------- | -------------------------------------------------------------------------- |
| `REDIS_ENABLED`                       | bool   | `false`               | If Redis is enabled for caching.                                           |
| `REDIS_HOST`                          | string | `localhost`           | The host of the Redis server.                                              |
| `REDIS_PORT`                          | int    | `6379`                | The port of the Redis server.                                              |
| `AWS_REGION`                          | string | `us-east-1`           | The AWS region for S3.                                                     |
| `S3_BUCKET`                           | string | `my-ocr-bucket`       | The S3 bucket to store files.                                              |
| `AWS_ACCESS_KEY_ID`                   | string | `null`                | The AWS access key ID for S3.                                              |
| `AWS_SECRET_ACCESS_KEY`               | string | `null`                | The AWS secret access key for S3.                                          |
| `ASYNC_CACHE_TTL`                     | int    | `600`                 | The time to live for async cache in seconds.                               |
| `FONT_PATH`                           | string | `./noto-sans.ttf`     | The path to the font file used for text overlay.                           |

## Example

```yml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/ocr-api:latest
    restart: unless-stopped
    environment:
      AWS_ACCESS_KEY_ID: YOUR_AWS_ACCESS_KEY_ID
      AWS_SECRET_ACCESS_KEY: YOUR_AWS_SECRET_ACCESS_KEY
      AWS_REGION: eu-central-1
      S3_BUCKET: my-ocr-api-bucket
    labels:
      - traefik.enable=true
      - traefik.http.routers.ocr-api.rule=Host(`ocr-api.example.com`)
      - traefik.http.services.ocr-api.loadbalancer.server.port=3000
```
