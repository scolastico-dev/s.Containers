# `s.containers/deployment-cli`

### [Back to index](../../README.md)

## Why?

To make at as easy as possible to deploy files to the [`s.containers/deployment-api`](../deployment-api/README.md) container.

## Environment Variables

| Name          | Type   | Default Value | Description                                                                                            |
|---------------|--------|---------------|--------------------------------------------------------------------------------------------------------|
| `SECRET`      | string | `null`        | The shared secret.                                                                                     |
| `ITERATIONS`  | number | `null`        | The number of iterations to perform MD5. If no iterations are set the secret will be used as the hash. |
| `SERVER_URL`  | string | `null`        | Url of the deployment api.                                                                             |
| `SERVER_NAME` | string | `null`        | Name of the configuration on the server.                                                               |
| `UPLOAD_DIR`  | string | `/from`       | The upload directory.                                                                                  |

See the [`s.containers/deployment-api`](../deployment-api/README.md) for more information about the environment variables.

## Example

```yaml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/deployment-cli:latest
    restart: 'no'
    volumes:
      - ./from/:/from
    environment:
      SECRET: my-secret
      SERVER_URL: https://deploy.example.com
      SERVER_NAME: web
```

or use this one-liner:

```bash
docker run -it --rm -v $(pwd)/from/:/from -e SECRET=my-secret -e SERVER_URL=https://deploy.example.com -e SERVER_NAME=web ghcr.io/scolastico-dev/s.containers/deployment-cli:latest
```

or use this gitlab ci example:

```yaml
stages:
  # ...
  - deploy

# [...]

deploy:
  stage: deploy
  when: manual
  image: ghcr.io/scolastico-dev/s.containers/deployment-cli:latest
#  needs:
#    - job: build
#      artifacts: true
  script:
    - >-
      cd /app &&
      SECRET=$DEPLOY_KEY
      SERVER_URL=https://deploy.example.com
      SERVER_NAME=vue
      UPLOAD_DIR=$CI_PROJECT_DIR/dist
      node /app/index.js
```
