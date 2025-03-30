# `s.containers/traefik-forward-auth`

### [Back to index](../../README.md)

## Why?

Secure your services easily against an external OIDC or OAuth2 provider.

## Environment Variables

| Name                                  | Type   | Default Value         | Description                                                                |
| ------------------------------------- | ------ | --------------------- | -------------------------------------------------------------------------- |
| `AUTH_HOST`                           | string | `null`                | The host to redirect to after the auth.                                    |
| `CLIENT_ID`                           | string | `null`                | The client ID for the external auth provider.                              |
| `CLIENT_SECRET`                       | string | `null`                | The client secret for the external auth provider.                          |
| `OIDC_ISSUER_URL`                     | string | `null`                | The URL to the OIDC issuer.                                                |
| `OAUTH2_TOKEN_URL`                    | string | `null`                | The URL to the OAuth2 token endpoint.                                      |
| `OAUTH2_AUTH_URL`                     | string | `null`                | The URL to the OAuth2 auth endpoint.                                       |
| `OAUTH2_USER_INFO_URL`                | string | `null`                | The URL to the OAuth2 user info endpoint.                                  |
| `OAUTH2_SCOPE`                        | string | `email`               | The scope for the OAuth2 request.                                          |
| `JWT_SECRET`                          | string | `null`                | The secret to sign the JWT, if not set, a random secret will be generated. |
| `JWT_TTL`                             | int    | `3600`                | The time to live for the JWT in seconds.                                   |
| `REDIRECT_URL`                        | string | `null`                | The URL to redirect if an user accidentally visits the auth endpoint.      |
| `COOKIE_NAME`                         | string | `X_FORWARD_AUTH`      | The name of the cookie.                                                    |
| `COOKIE_SECURE`                       | bool   | `true`                | If the cookie should be secure.                                            |
| `COOKIE_HTTP_ONLY`                    | bool   | `true`                | If the cookie should be http only.                                         |

If `OIDC_ISSUER_URL` is set, the `OAUTH2_*` variables will be ignored.

## Example

```yml
x-restart: &restart
  restart: unless-stopped

services:
  auth:
    image: ghcr.io/scolastico-dev/s.containers/traefik-forward-auth:latest
    <<: *restart
    environment:
      CLIENT_ID: YOUR_CLIENT_ID
      CLIENT_SECRET: YOUR_CLIENT_SECRET
      OIDC_ISSUER_URL: https://your-oidc-issuer.com/.well-known/openid-configuration
      AUTH_HOST: http://auth.local.scolastico.me
      COOKIE_SECURE: false
    labels:
      - traefik.enable=true
      - traefik.http.routers.auth-index.rule=Host(`auth.local.scolastico.me`) && Path(`/`)
      - traefik.http.routers.auth-index.middlewares=auth
      - traefik.http.routers.auth-index.service=auth
      - traefik.http.routers.auth-api.rule=Host(`auth.local.scolastico.me`)
      - traefik.http.routers.auth-api.service=auth
      - traefik.http.services.auth.loadbalancer.server.port=3000
      - traefik.http.middlewares.auth.forwardauth.address=http://auth:3000/auth

  echo:
    image: ghcr.io/scolastico-dev/s.containers/http-echo:latest
    <<: *restart
    labels:
      - traefik.enable=true
      - traefik.http.routers.echo.rule=Host(`echo.local.scolastico.me`)
      - traefik.http.routers.echo.middlewares=auth
      - traefik.http.services.echo.loadbalancer.server.port=3000

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
```
