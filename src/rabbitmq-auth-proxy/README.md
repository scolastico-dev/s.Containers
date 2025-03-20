# `s.containers/rabbitmq-auth-proxy`

### [Back to index](../../README.md)

## Why?

Remove the login form of the RabbitMQ Management UI and allow access to the UI without the need to enter your credentials.
This is useful if you want to apply a forward authentication with your favorite reverse proxy.

Like for example with [traefik](https://doc.traefik.io/traefik/middlewares/forwardauth/)
and [s.containers/traefik-forward-auth](../traefik-forward-auth/README.md).

## Environment Variables

### Server

| Name                      | Type    | Default Value | Description                                                    |
|---------------------------|---------|---------------|----------------------------------------------------------------|
| `RABBITMQ_URL`            | string  | -             | The URL of the RabbitMQ instance.                               |
| `RABBITMQ_USER`           | string  | `guest`       | The username for the RabbitMQ instance.                         |
| `RABBITMQ_PASSWORD`       | string  | `guest`       | The password for the RabbitMQ instance.                         |

## Example

```yaml
x-restart: &restart
  restart: unless-stopped

services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/rabbitmq-auth-proxy:latest
    <<: *restart
    depends_on:
      rabbitmq:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      RABBITMQ_URL: http://rabbitmq:15672
  rabbitmq:
    image: rabbitmq:3.13.7-management-alpine
    <<: *restart
    volumes:
      - data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 30s
      timeout: 10s
      retries: 6

volumes:
  data:
```
