# `s.containers/compose-file-loader`
### [Back to index](../../README.md)

## Why?
At times, I find myself desiring a feature akin to Kubernetes' ConfigMaps.
This particular container proves to be ideal for providing concise
configuration files to your containers, eliminating the necessity for
composing deployment instructions for said files.

## Environment Variables
| Name                                | Type   | Default Value | Description                     |
|-------------------------------------|--------|---------------|---------------------------------|
| `FILE_<name>_PATH`                  | string | `null`        | The path of the file.           |
| `FILE_<name>_CONTENT`               | string | `null`        | The content of the file.        |
| `FILE_<name>_URL`                   | string | `null`        | The url of the file. (download) |
| `FILE_<name>_UNSECURE`              | bool   | `false`       | Allow non-https urls.           |
| `FILE_<name>_OVERRIDES_USER`        | number | `1000`        | The user override value.        |
| `FILE_<name>_OVERRIDES_GROUP`       | number | `1000`        | The group override value.       |
| `FILE_<name>_OVERRIDES_PERMISSIONS` | number | `777`         | The permissions override value. |

`FILE_<name>_PATH` and either `FILE_<name>_CONTENT` or `FILE_<name>_URL` are required.

## Example
```yml
version: "3"
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/compose-file-loader:latest
    restart: 'no'
    volumes:
      - myVolume:/tmp/myVolume
    environment:
      FILE_CONFIG_PATH: /tmp/myVolume/config.json
      FILE_CONFIG_OVERRIDES_USER: 1000
      FILE_CONFIG_OVERRIDES_GROUP: 1000
      FILE_CONFIG_OVERRIDES_PERMISSIONS: 777
      FILE_CONFIG_CONTENT: |
        {
        "foo": "bar"
        }
```
