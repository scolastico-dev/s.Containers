# `s.containers/signoz-auth-proxy`

### [Back to index](../../README.md)

## Why?

SigNoz is an great open-source observability tool for monitoring and troubleshooting applications.
Tho its developers decided to make OAuth a enterprise feature, demanding a [sso tax](https://sso.tax/).
This proxy does remove the login feature, and allow you to open the SigNoz UI without the need to enter your credentials.
With this setup, you can easily apply a forward authentication with your favorite reverse proxy.

Like for example with [traefik](https://doc.traefik.io/traefik/middlewares/forwardauth/)
and [s.containers/traefik-forward-auth](../traefik-forward-auth/README.md).

_See the statement of the SigNoz developers [here](https://github.com/SigNoz/signoz/issues/1188#issuecomment-1288334578)._

## Environment Variables

### Server

| Name                       | Type    | Default Value | Description                                                    |
|----------------------------|---------|---------------|----------------------------------------------------------------|
| `SIGNOZ_URL`               | string  | -             | The URL of the Signoz instance.                                 |
| `SIGNOZ_USER`              | string  | -             | The username for the Signoz instance.                           |
| `SIGNOZ_PASSWORD`          | string  | -             | The password for the Signoz instance.                           |

## Example

```yaml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/signoz-auth-proxy:latest
    ports:
      - "3000:3000"
    environment:
      SIGNOZ_URL: "http://signoz:3000"
      SIGNOZ_USER: "admin"
      SIGNOZ_PASSWORD: "admin"
```

or add this `docker-compose.override.yml` to your `signoz/deploy/docker` directory:

```yaml
services:
  otel-collector:
    ports: []
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.signoz-ingest.tls.certresolver=default"
      - "traefik.http.routers.signoz-ingest.rule=Host(`signoz.example.com`) && Header(`signoz-access-token`,`my-secret-token`)"
      - "traefik.http.services.signoz-ingest.loadbalancer.server.port=4317"
      - "traefik.http.services.signoz-ingest.loadbalancer.server.scheme=h2c"
  frontend:
    ports: []
  oauth-proxy:
    image: ghcr.io/scolastico-dev/s.containers/signoz-auth-proxy:latest
    restart: unless-stopped
    networks:
      - signoz-net
    environment:
      SIGNOZ_URL: http://frontend:3301
      SIGNOZ_USER: admin
      SIGNOZ_PASSWORD: admin
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.signoz.tls.certresolver=default"
      - "traefik.http.routers.signoz.rule=Host(`signoz.example.com`)"
      - "traefik.http.routers.signoz.middlewares=forward-auth" # Change this to your middleware name
      - "traefik.http.services.signoz.loadbalancer.server.port=3000"
      - "traefik.http.services.signoz.loadbalancer.server.scheme=http"
```
