# `s.containers/compose-file-loader`
### [Back to index](../../README.md)

## Why?
At times, I find myself desiring a feature akin to Kubernetes' ConfigMaps.
This particular container proves to be ideal for providing concise
configuration files to your containers, eliminating the necessity for
composing deployment instructions for said files.

## Environment Variables
| Name                                | Type   | Default Value | Description                                                       |
|-------------------------------------|--------|---------------|-------------------------------------------------------------------|
| `FILE_<name>_PATH`                  | string | `null`        | The path of the file.                                             |
| `FILE_<name>_CONTENT`               | string | `null`        | The content of the file.                                          |
| `FILE_<name>_URL`                   | string | `null`        | The url of the file. (download)                                   |
| `FILE_<name>_UNSECURE`              | bool   | `false`       | Allow non-https urls.                                             |
| `FILE_<name>_BASE64`                | bool   | `false`       | Base64 decode the content. Does not work with `URL`.              |
| `FILE_<name>_OVERRIDES_USER`        | number | `1000`        | The user override value.                                          |
| `FILE_<name>_OVERRIDES_GROUP`       | number | `1000`        | The group override value.                                         |
| `FILE_<name>_OVERRIDES_PERMISSIONS` | number | `777`         | The permissions override value.                                   |
| `FILE_<name>_MODE`                  | string | `create`      | The mode of the file.                                             |
| `FILE_<name>_REGEX`                 | string | `null`        | The regex to replace.                                             |
| `FILE_<name>_FAIL_ON_ERROR`         | bool   | `false`       | Fail on error.                                                    |
| `FILE_<name>_FIX_DIR_PERMS`         | bool   | `false`       | Different chmod for directories. Intended to give directories +x. |
| `ORDER`                             | string | `null`        | Comma separated list of file names.                               |
| `SLEEP`                             | number | `0`           | Sleep time in milliseconds.                                       |
| `SLEEP_AFTER`                       | number | `10000`       | Sleep time in milliseconds after all files are processed.         |

`FILE_<name>_PATH` and either `FILE_<name>_CONTENT` or `FILE_<name>_URL` are required.

### Possible Modes
| Mode      | Description                                                            | Needs `CONTENT` or `URL`                              |
|-----------|------------------------------------------------------------------------|-------------------------------------------------------|
| `create`  | Creates the file if it does not exist.                                 | Yes                                                   |
| `update`  | Updates the file if it exists.                                         | Yes                                                   |
| `delete`  | Deletes the file if it exists.                                         | No                                                    |
| `replace` | Replaces the file if it exists.                                        | Yes                                                   |
| `append`  | Appends the file if it exists.                                         | Yes                                                   |
| `prepend` | Prepends the file if it exists.                                        | Yes                                                   |
| `perm`    | Sets only the permissions of the file if it exists.                    | No                                                    |
| `permr`   | Sets only the permissions of the file if it exists recursively.        | No                                                    |
| `mkdir`   | Creates the directory if it does not exist.                            | No                                                    |
| `unzip`   | Unzips a zip file to a directory.                                      | Yes, but content will be handled as a path to a file. |
| `exists`  | Checks if the file exists. (Throws an error if it does not exist.)     | No                                                    |
| `missing` | Checks if the file does not exist. (Throws an error if it does exist.) | No                                                    |

`mkdir`, `perm`, `permr` and `delete` do not accept `FILE_<name>_CONTENT` or `FILE_<name>_URL`.

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
      ORDER: DELETEFIRST,KEYS
      SLEEP: 5000
      FILE_CONFIG_PATH: /tmp/myVolume/config.json
      FILE_CONFIG_OVERRIDES_USER: 1000
      FILE_CONFIG_OVERRIDES_GROUP: 1000
      FILE_CONFIG_OVERRIDES_PERMISSIONS: 777
      FILE_CONFIG_CONTENT: |
        {
        "foo": "bar"
        }
      FILE_DELETEFIRST_PATH: /tmp/myVolume/keys.txt
      FILE_DELETEFIRST_MODE: delete
      FILE_KEYS_PATH: /tmp/myVolume/keys.txt
      FILE_KEYS_URL: https://raw.githubusercontent.com/scolastico-dev/s.containers/master/src/compose-file-loader/README.md
      FILE_KEYS_MODE: create
```
