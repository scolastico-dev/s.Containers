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
| `SIGNOZ_USERNAME`          | string  | -             | The username for the Signoz instance.                           |
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
      SIGNOZ_USERNAME: "admin"
      SIGNOZ_PASSWORD: "admin"
```
