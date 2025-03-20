# `s.containers/traefik-app-dashboard`

### [Back to index](../../README.md)

## Why?

This container uses the traefik API to fetch all available services and generates a dashboard for them.

Never have to worry about documenting all your services again.

## Environment Variables

| Name                                  | Type   | Default Value         | Description                            |
| ------------------------------------- | ------ | --------------------- | -------------------------------------- |
| `TRAEFIK_API`                         | string | `http://traefik:8080` | The URL to the traefik API.            |
| `IGNORE_REGEX`                        | string | `null`                | A regex to ignore services.            |
| `CACHE_TTL`                           | int    | `60`                  | The time to cache the services in sec. |
| `OVERRIDE_<SERVICE_NAME>_NAME`        | string | `null`                | Override the name of a service.        |
| `OVERRIDE_<SERVICE_NAME>_URL`         | string | `null`                | Override the URL of a service.         |
| `OVERRIDE_<SERVICE_NAME>_IMG`         | string | `null`                | Override the image of a service.       |
| `OVERRIDE_<SERVICE_NAME>_DESCRIPTION` | string | `null`                | Override the description of a service. |
| `OVERRIDE_<SERVICE_NAME>_HIDDEN`      | bool   | `false`               | Hide a service explicitly.             |

All `OVERRIDE_<SERVICE_NAME>_` variables are also available via docker
labels if the `/var/run/docker.sock` is mounted. The format is then:

- `traefik-app-dashboard.<SERVICE_NAME>.<OVERRIDE_KEY>=<OVERRIDE_VALUE>`

## Example

```yml
x-restart: &restart
  restart: unless-stopped

services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/traefik-app-dashboard:latest
    <<: *restart
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    labels:
      - traefik.enable=true
      - traefik.http.routers.app-dashboard.rule=Host(`dashboard.local.scolastico.me`)
      - traefik.http.services.app-dashboard.loadbalancer.server.port=3000
      - traefik-app-dashboard.app-dashboard.description=The dashboard for all services.

  traefik:
    image: traefik:latest
    <<: *restart
    ports:
      - 80:80
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command:
      - --providers.docker
      - --providers.docker.exposedbydefault=false
      - --entrypoints.http.address=:80
      - --api.insecure=true
```
