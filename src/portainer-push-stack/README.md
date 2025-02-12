# `s.containers/portainer-push-stack`

### [Back to index](../../README.md)

## Why?

As the webhook feature of Portainer does not allow updating the content of a stack, this container pushes the stack to the Portainer API.

## Environment Variables

| Name             | Type   | Default Value | Description                                                                 |
| ---------------- | ------ | ------------- | --------------------------------------------------------------------------- |
| `PORTAINER_URL`  | string | `null`        | The URL to the Portainer API.                                               |
| `PORTAINER_KEY`  | string | `null`        | The API key for the Portainer API.                                          |
| `ENDPOINT_ID`    | string | `null`        | The ID of the endpoint to use.                                              |
| `STACK_ID`       | string | `null`        | The ID of the stack to update.                                              |
| `STACK_FILE`     | string | `compose.yml` | The file to push.                                                           |
| `IGNORE_DOT_ENV` | bool   | `false`       | Ignore the `.env` file.                                                     |
| `RE_PULL_IMAGES` | bool   | `true`        | Re-pull images before pushing the stack.                                    |
| `PRUNE_SERVICES` | bool   | `true`        | Prune services which are not in the stack anymore.                          |

## Example

After you have deployed a stack in portainer, and open it you should see an URL like this, which contains the stack id and the endpoint id:

```log
https://portainer.example.com/#!/<endpoint_id>/docker/stacks/<stack_name>?id=<stack_id>&type=2&regular=true&orphaned=false&orphanedRunning=false
```

To get the `PORTAINER_KEY` see the [Portainer API documentation](https://docs.portainer.io/api/access).

You can then push/update the stack with the following command:

```bash
docker run --rm \
  -e PORTAINER_URL="https://portainer.example.com" \
  -e PORTAINER_KEY="<api-key>" \
  -e ENDPOINT_ID="<endpoint-id>" \
  -e STACK_ID="<stack-id>" \
  -v "$(pwd):/data" \
  ghcr.io/scolastico-dev/s.containers/portainer-push-stack
```
