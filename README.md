# [![s.Containers](./.github/logo.png)](#)

## Info

### What is this?

A docker container library of *unmaintained* tool images

### Why?

I don't want to create for every small tool I need a special git repository.

### Backwards compatibility?

All containers are backwards-compatible and will be updated in a way that you can safely use
the `latest` tag of every container.

## Index

Click on the name for more infos.

### [`s.containers/cron`](./src/cron/README.md)

The cron container is for easy creation of cron jobs and intended for the usage inside a
docker compose stack. **It is not intended for the usage outside a docker compose stack.
For that use native cron!**

### [`s.containers/web-cfg-editor`](./src/web-cfg-editor/README.md)

Easily edit config files in a web interface which can be secured with authentication.
The editor does not support the editing of binary files.

### [`s.containers/hastebin`](./src/hastebin/README.md)

A simple, lightweight pastebin that allows you to share snippets of code with others.

### [`s.containers/deployment-api`](./src/deployment-api/README.md)

Tired of using sftp or rsync to deploy your files? This container will enable you to
deploy your files directly to the container via a simple post request with a zip file.

### [`s.containers/deployment-cli`](./src/deployment-cli/README.md)

A simple cli tool to deploy files to the deployment-api container.

### [`s.containers/compose-file-loader`](./src/compose-file-loader/README.md)

Wanted ever to load configs into volumes from a docker-compose file like config maps
from kubernetes? This container will enable you to do that.

### [`s.containers/owa`](./src/owa/README.md)

A simple container to run the open web analytics (OWA) server. OWA is a free and open
source web analytics platform.

### [`s.containers/http-echo`](./src/http-echo/README.md)

Debugging your reverse proxy? Or just want to see what the server would receive? This
container will echo the request it receives.

### [`s.containers/restart-webhook`](./src/restart-webhook/README.md)

Restart Webhook provides an easy way to automatically update and restart Docker
containers or images based on a simple API call.

### [`s.containers/websocket-relay`](./src/websocket-relay/README.md)

The WebSocket Relay is a container that functions similarly to ngrok, making it ideal
for forwarding local pages to a publicly accessible server.

### [`s.containers/http-single-file`](./src/http-single-file/README.md)

A simple container to serve a single file via http. This can be useful if you want to
serve a single file or modify a single file, for example a css file.

### [`s.containers/email-lexoffice-import`](./src/email-lexoffice-import/README.md)

Automatically import invoices from your email account into lexoffice.

### [`s.containers/matrix-webhook`](./src/matrix-webhook/README.md)

Send messages to matrix channels via a simple http webhook.

### [`s.containers/ms-ics-fix`](./src/ms-ics-fix/README.md)

Fix wrong timezone data in ICS exports from Microsoft 365 / Outlook.

### [`s.containers/s3-backup`](./src/s3-backup/README.md)

A easy to use backup container, which can backup folders, or docker
volumes to s3 compatible storage.

### [`s.containers/form-api`](./src/form-api/README.md)

Form API is a simple form to email service. It is a simple way to send
form data to an email address.

### [`s.containers/kiwix-sync`](./src/kiwix-sync/README.md)

This container is a simple script which periodically downloads the latest
version of a file found at a given file server, with enabled index listing.

### [`s.containers/dyn-redirect`](./src/dyn-redirect/README.md)

A simple API which does HTTP 301 or 302 redirects based on settings provided
either by environment variables or a post request from external sources.

### [`s.containers/timeoff-management`](./src/timeoff-management/README.md)

A wrapper for the [timeoff.management](https://github.com/timeoff-management/timeoff-management-application) application.

### [`s.containers/compose-merger`](./src/compose-merger/README.md)

Merge multiple docker-compose files into one.

### [`s.containers/traefik-public-ssl-cert`](./src/traefik-public-ssl-cert/README.md)

Expose a certificate from a traefik container to an HTTP API.

### [`s.containers/traefik-app-dashboard`](./src/traefik-app-dashboard/README.md)

This container uses the traefik API to fetch all available services and generates a dashboard for them.

### [`s.containers/portainer-push-stack`](./src/portainer-push-stack/README.md)

As the webhook feature of Portainer does not allow updating the content of a stack, this container pushes the stack to the Portainer API.

### [`s.containers/traefik-forward-auth`](./src/traefik-forward-auth/README.md)

Secure your services easily against an external OIDC or OAuth2 provider.

### [`s.containers/web-term-wrapper`](./src/web-term-wrapper/README.md)

Start terminal applications in your browser with ease.

### [`s.containers/web-term-otel-tui`](./src/web-term-otel-tui/README.md)

A wrapper for the [ymtdzz/otel-tui](https://github.com/ymtdzzz/otel-tui) to run it in a web terminal.

### [`s.containers/github-commit-hash-expose`](./src/github-commit-hash-expose/README.md)

Expose the latest commit hash of a GitHub repository's default branch via a simple API, with optional hashing and caching.

### [`s.containers/docker-health-otel-metrics-exporter`](./src/docker-health-otel-metrics-exporter/README.md)

Export health metrics of docker containers to an OpenTelemetry collector.

### [`s.containers/signoz-auth-proxy`](./src/signoz-auth-proxy/README.md)

This proxy does removes the login feature of SigNoz, and allow you to open the SigNoz UI without the need to enter your credentials.

### [`s.containers/easy-pg-admin`](./src/easy-pg-admin/README.md)

Setup a pgAdmin instance with a pre configured server and disabled authentication.

### [`s.containers/minio-auth-proxy`](./src/minio-auth-proxy/README.md)

Remove the login form of the Minio Management UI and allow access to the UI without the need to enter your credentials.

### [`s.containers/rabbitmq-auth-proxy`](./src/rabbitmq-auth-proxy/README.md)

Remove the login form of the RabbitMQ Management UI and allow access to the UI without the need to enter your credentials.
