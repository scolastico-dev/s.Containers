# `s.containers/deployment-api`
### [Back to index](../../README.md)

## Why?
For every small website a container is overkill. This image will
enable you to use for example httpd or nginx to serve your website
and enable you an easy way to deploy your website directly to the container.

Sure there are other ways like sftp or rsync but a simple post request with a zip file is much easier.

## Environment Variables
| Name                                         | Type   | Default Value | Description                              |
|----------------------------------------------|--------|---------------|------------------------------------------|
| `PORT`                                       | number | `3000`        | The port to bind to.                     |
| `MD5_ITERATIONS`                             | number | `50`          | The number of iterations to perform MD5. |
| `APP_LOCATIONS_<name>_PATH`                  | string | `null`        | The path of the location.                |
| `APP_LOCATIONS_<name>_OVERRIDES_USER`        | number | `null`        | The user override value.                 |
| `APP_LOCATIONS_<name>_OVERRIDES_GROUP`       | number | `null`        | The group override value.                |
| `APP_LOCATIONS_<name>_OVERRIDES_PERMISSIONS` | number | `null`        | The permissions override value.          |
| `APP_LOCATIONS_<name>_KEY_TYPE`              | string | `key`         | The key type. (key or md5)               |
| `APP_LOCATIONS_<name>_KEY_SECRET`            | string | `null`        | The secret value.                        |

## Example
```yaml
version: "3"
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/deployment-api:latest
    volumes:
      - data:/data
    environment:
      APP_LOCATIONS_WEB_PATH: /data
      APP_LOCATIONS_WEB_KEY_TYPE: md5
      APP_LOCATIONS_WEB_KEY_SECRET: 0000-0000-0000-0000-0000-0000-0000
      APP_LOCATIONS_WEB_OVERRIDES_USER: 1000
      APP_LOCATIONS_WEB_OVERRIDES_GROUP: 1000
      APP_LOCATIONS_WEB_OVERRIDES_PERMISSIONS: 777
      MD5_ITERATIONS: 100
    ports:
      - "3000:3000"

  web:
    image: httpd:2
    volumes:
      - data:/var/www/html

volumes:
  data:
```

To deploy a directory see the [`s.containers/deployment-cli`](../deployment-cli/README.md) container.
