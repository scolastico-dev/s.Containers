# `s.containers/minio-auth-proxy`

### [Back to index](../../README.md)

## Why?

Sometimes you need an S3 instance which only serves a single application.
Why should you bother about managing IAM users and policies?
This proxy does remove the login feature, and allow you to open
the Minio UI without the need to enter your credentials.
With this setup, you can easily apply a forward authentication with your favorite reverse proxy.

Like for example with [traefik](https://doc.traefik.io/traefik/middlewares/forwardauth/)
and [s.containers/traefik-forward-auth](../traefik-forward-auth/README.md).

## Environment Variables

### Server

| Name                      | Type    | Default Value | Description                                                    |
|---------------------------|---------|---------------|----------------------------------------------------------------|
| `MINIO_URL`               | string  | -             | The URL of the Minio instance.                                 |
| `MINIO_USER`              | string  | -             | The username for the Minio instance.                           |
| `MINIO_PASSWORD`          | string  | -             | The password for the Minio instance.                           |

## Example

```yaml
x-restart: &restart
  restart: unless-stopped

services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/minio-auth-proxy:latest
    <<: *restart
    depends_on:
      minio:
        condition: service_healthy
    ports:
      - "9001:3000"
    environment:
      SIGNOZ_URL: http://minio:9001
      SIGNOZ_USER: admin@example.com
      SIGNOZ_PASSWORD: admin@example.com
  minio:
    image: bitnami/minio:2023-debian-11
    <<: *restart
    ports:
      - "9000:9000"
    environment:
      MINIO_ROOT_USER: admin@example.com
      MINIO_ROOT_PASSWORD: admin@example.com
      MINIO_DEFAULT_BUCKETS: my-public-bucket,my-private-bucket
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 10s
      retries: 6
    volumes:
      - data:/bitnami/minio/data
  init:
    image: bitnami/minio-client:2023-debian-11
    restart: 'no'
    depends_on:
      minio:
        condition: service_healthy
    command: >
      sh -c "mc alias set minio http://minio:9000 admin@example.com admin@example.com &&
      mc anonymous set public minio/my-public-bucket"
```
