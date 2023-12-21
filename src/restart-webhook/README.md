# `s.containers/restart-webhook`

### [Back to index](../../README.md)

## Usage Warning

I noticed that restarting containers will not update the image. Image updates
require recreation of the containers which can be quiet tricky to achieve as
docker containers can have a lot of configurations and dependencies.

If you want to achieve this, I recommend to use watchtower with the Http API.
See: https://containrrr.dev/watchtower/http-api-mode/

## Why?

Restart Webhook provides an easy way to automatically update and restart
Docker containers or images based on a simple API call. It is designed to
integrate with your existing infrastructure, enabling you to trigger updates
and restarts remotely through a webhook. This can be especially useful in
scenarios where you want to automate container management or integrate with
CI/CD pipelines.

## Environment Variables

| Name                   | Type    | Default Value | Description                                                           |
|------------------------|---------|---------------|-----------------------------------------------------------------------|
| `CFG_<name>_IMAGE`     | string  | `null`        | The name of the Docker image to update.                               |
| `CFG_<name>_CONTAINER` | string  | `null`        | The name of the Docker container to restart.                          |
| `CFG_<name>_TOKEN`     | string  | `null`        | The token used to authenticate the API call.                          |
| `CFG_<name>_CLEANUP`   | boolean | `null`        | If `true`, the last image will be deleted.                            |
| `CFG_<name>_KEEP`      | integer | `null`        | The number of old images to keep.                                     |
| `CFG_<name>_REGISTRY`  | string  | `null`        | The registry to pull the image from. Optional if the image is public. |
| `CFG_<name>_USER`      | string  | `null`        | The user to authenticate with the registry.                           |
| `CFG_<name>_PASS`      | string  | `null`        | The password to authenticate with the registry.                       |
| `DEFAULT_CLEANUP`      | boolean | `false`       | The default value for cleanup if not specified in the CFG.            |
| `DEFAULT_KEEP`         | integer | `1`           | The default number of old images to keep if not specified in the CFG. |
| `PORT`                 | integer | `3000`        | The port to bind to.                                                  |

The API provides an endpoint that accepts GET requests at `/<token>`, where
`<token>` is the value of the `CFG_<name>_TOKEN` environment variable.

## Example

```yaml
version: "3"
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/restart-webhook:latest
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      CFG_ECHO_IMAGE: ghcr.io/scolastico-dev/s.containers/http-echo:latest
      CFG_ECHO_CONTAINER: http-echo
      CFG_ECHO_TOKEN: your_unique_token_that_should_be_at_least_32_characters_long_1
      CFG_ECHO_KEEP: 3
      CFG_DEPLOY_IMAGE: ghcr.io/scolastico-dev/s.containers/deployment-api:latest
      CFG_DEPLOY_TOKEN: your_unique_token_that_should_be_at_least_32_characters_long_2
      CFG_DEPLOY_CLEANUP: false
      DEFAULT_CLEANUP: true
```
