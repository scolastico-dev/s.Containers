# `s.containers/smtp-relay`

### [Back to index](../../README.md)

## Why?

Sometimes you want to give each app its own access data for the same email account.
So if one app gets compromised, the others are still safe.
This container will relay all received emails to a second SMTP server,
giving you the ability to create virtual email accounts for each app.
Also, this can be used if you have an app which requires an email account,
but you want to use for example the google workspace
[SMTP relay service](https://support.google.com/a/answer/2956491?hl=en)
with IP whitelisting and no authentication.

## Environment Variables

| Name                        | Type   | Default Value       | Description                                                                      |
| --------------------------- | ------ | ------------------- | -------------------------------------------------------------------------------- |
| `SEND_FROM`                 | string | `null`              | The email address to use as the sender.                                          |
| `SEND_USER`                 | string | `null`              | The username to use for the sender.                                              |
| `SEND_PASS`                 | string | `null`              | The password to use for the sender.                                              |
| `SEND_HOST`                 | string | `null`              | The SMTP server to use as the sender.                                            |
| `SEND_PORT`                 | int    | `578`               | The SMTP server port to use as the sender.                                       |
| `SEND_SECURE`               | bool   | `false`             | Whether to use TLS for the SMTP server.                                          |
| `SEND_NO_VERIFY`            | bool   | `false`             | Whether to skip testing the connection to the SMTP server.                       |
| `RECEIVE_KEY`               | string | `null`              | The key to use, if you want to enable tls for the relay.                         |
| `RECEIVE_CERT`              | string | `null`              | The certificate to use, if you want to enable tls for the relay.                 |
| `RECEIVE_TRAEFIK_KEY_STORE` | string | `null`              | The path to the traefik key store, if you want to enable tls for the relay.      |
| `RECEIVE_TRAEFIK_ROOT_KEY`  | string | `null`              | The root key for the traefik key store, if you want to enable tls for the relay. |
| `ACCOUNT_<ID>_USER`         | string | `null`              | The username to use for the account.                                             |
| `ACCOUNT_<ID>_PASS`         | string | `null`              | The password to use for the account.                                             |

## Example

```yml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/smtp-relay:latest
    restart: unless-stopped
    ports:
      - 25:25
      - 465:465
      - 587:587
    volumes:
      - data:/data:ro
    environment:
      SEND_FROM: noreply@example.com
      SEND_USER: noreply@example.com
      SEND_PASS: <YOUR_PASSWORD>
      SEND_HOST: smtp.example.com
      SEND_PORT: 465
      SEND_SECURE: true
      RECEIVE_TRAEFIK_KEY_STORE: /data/acme.json
      RECEIVE_TRAEFIK_ROOT_KEY: smtp-relay.example.com
      ACCOUNT_EXAMPLE_USER: example@example.com
      ACCOUNT_EXAMPLE_PASS: <YOUR_PASSWORD>
  traefik:
    image: traefik:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - data:/data
    command:
      - --providers.docker
      - --providers.docker.exposedbydefault=false
      - --entrypoints.http.address=:80
      - --entrypoints.https.address=:443
      - --certificatesresolvers.dns.acme.email=acme@example.com
      - --certificatesresolvers.dns.acme.storage=/data/acme.json
      - --certificatesresolvers.dns.acme.dnschallenge=true
      - --certificatesresolvers.dns.acme.dnschallenge.provider=cloudflare
    environment:
      CF_DNS_API_TOKEN: <YOUR_CLOUDFLARE_API_TOKEN>
volume:
  data:
```
