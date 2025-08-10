# `s.containers/smtp-relay`

### [Back to index](../../README.md)

## Why?

Sometimes you want to give each app its own access data for the same email account.
So if one app gets compromised, the others are still safe.
This container will relay all received emails to a second SMTP server,
giving you the ability to create virtual email accounts for each app.
Also, this can be used if you have an app which requires an email account,
but you want to use for example the Google Workspace
[SMTP relay service](https://support.google.com/a/answer/2956491?hl=en)
with IP whitelisting and no authentication.

## Environment Variables

| Name                         | Type   | Default Value      | Description                                                                                               |
|------------------------------|--------|--------------------|-----------------------------------------------------------------------------------------------------------|
| `SEND_FROM`                  | string | `null`             | The email address to use as the sender.                                                                   |
| `SEND_NAME`                  | string | `null`             | The name to use as the sender.                                                                            |
| `SEND_REPLY_TO`              | string | `null`             | The email address to use as the reply-to address.                                                         |
| `SEND_USER`                  | string | `null`             | The username to use for the sender.                                                                       |
| `SEND_PASS`                  | string | `null`             | The password to use for the sender.                                                                       |
| `SEND_HOST`                  | string | `null`             | The SMTP server to use as the sender.                                                                     |
| `SEND_PORT`                  | int    | `587`              | The SMTP server port to use as the sender.                                                                |
| `SEND_SECURE`                | bool   | `false`            | Whether to use TLS for the SMTP server.                                                                   |
| `SEND_NO_VERIFY`             | bool   | `false`            | Whether to skip testing the connection to the SMTP server.                                                |
| `SEND_POOL_ENABLED`          | bool   | `true`             | Whether to enable connection pooling for the SMTP server.                                                 |
| `SEND_POOL_MAX_CONNECTIONS`  | int    | `1`                | The maximum number of connections to the SMTP server to keep open.                                        |
| `SEND_POOL_MAX_MESSAGES`     | int    | `100`              | The maximum number of messages to send per connection before reconnecting.                                |
| `SEND_EHLO_NAME`             | string | `null`             | Optional EHLO/HELO hostname to send when connecting to the SMTP server. Should match a valid public FQDN. |
| `SEND_FORCE_IPV4`            | bool   | `false`            | If `true`, forces connections to use IPv4 instead of IPv6.                                                |
| `SEND_SOCKET_TIMEOUT_MS`     | int    | `30000`            | Per-socket timeout for outbound SMTP connections (in milliseconds).                                       |
| `SEND_CONNECTION_TIMEOUT_MS` | int    | `30000`            | Timeout for establishing a connection to the SMTP server (in milliseconds).                               |
| `RECEIVE_KEY`                | string | `null`             | The key to use, if you want to enable TLS for the receiving server.                                       |
| `RECEIVE_CERT`               | string | `null`             | The certificate to use, if you want to enable TLS for the receiving server.                               |
| `RECEIVE_TRAEFIK_KEY_STORE`  | string | `null`             | The path to the Traefik key store, if you want to enable TLS for the receiving server.                    |
| `RECEIVE_TRAEFIK_ROOT_KEY`   | string | `null`             | The root key for the Traefik key store, if you want to enable TLS for the receiving server.               |
| `ACCOUNT_<ID>_USER`          | string | `null`             | The username to use for the account.                                                                      |
| `ACCOUNT_<ID>_PASS`          | string | `null`             | The password to use for the account.                                                                      |
| `ACCOUNT_<ID>_FROM`          | string | `null`             | The email address to use as the sender for the account. (Overrides `SEND_FROM`)                           |
| `ACCOUNT_<ID>_NAME`          | string | `null`             | The name to use as the sender for the account. (Overrides `SEND_NAME`)                                    |
| `ACCOUNT_<ID>_REPLY_TO`      | string | `null`             | The email address to use as the reply-to address for the account. (Overrides `SEND_REPLY_TO`)             |
| **Queue Options**            |        |                    |                                                                                                           |
| `QUEUE_ENABLED`              | bool   | `false`            | If `true`, enable on-disk email queue with retry worker.                                                  |
| `QUEUE_DIR`                  | string | `/data/mail-queue` | Directory where queued emails will be stored.                                                             |
| `QUEUE_WORKER_INTERVAL_MS`   | int    | `2000`             | Interval in milliseconds between queue scans.                                                             |
| `QUEUE_RETRY_BASE_DELAY_MS`  | int    | `2000`             | Initial delay before retrying a failed send (milliseconds).                                               |
| `QUEUE_MAX_BACKOFF_MS`       | int    | `600000`           | Maximum backoff delay between retries (milliseconds).                                                     |
| `QUEUE_JITTER_MS`            | int    | `500`              | Random jitter added to retry delay to avoid retry storms.                                                 |
| `QUEUE_ATTEMPT_TIMEOUT_MS`   | int    | `30000`            | Timeout per send attempt (milliseconds).                                                                  |

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
      - data:/data
    environment:
      SEND_FROM: noreply@example.com
      SEND_USER: noreply@example.com
      SEND_PASS: <YOUR_PASSWORD>
      SEND_HOST: smtp.example.com
      SEND_PORT: 587
      SEND_SECURE: false
      SEND_POOL_ENABLED: true
      SEND_POOL_MAX_CONNECTIONS: 1
      SEND_POOL_MAX_MESSAGES: 100
      SEND_EHLO_NAME: mail.example.com
      QUEUE_ENABLED: true
      QUEUE_DIR: /data/mail-queue
      QUEUE_WORKER_INTERVAL_MS: 2000
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
volumes:
  data:
```
