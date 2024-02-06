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

A simple container to serve a single file via http. This can be useful if you want to serve a single file or modify a single file, for example a css file.

### [`s.containers/email-lexoffice-import`](./src/email-lexoffice-import/README.md)

Automatically import invoices from your email account into lexoffice.
