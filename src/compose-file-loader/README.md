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
| `FILE_<name>_SLEEP_BEFORE`          | number | `0`           | Sleep time in milliseconds, before processing the file.           |
| `FILE_<name>_SLEEP_AFTER`           | number | `0`           | Sleep time in milliseconds, after processing the file.            |
| `ORDER`                             | string | `null`        | Comma separated list of file names.                               |
| `SLEEP`                             | number | `0`           | Sleep time in milliseconds.                                       |
| `SLEEP_AFTER`                       | number | `10000`       | Sleep time in milliseconds after all files are processed.         |
| `SILENT`                            | bool   | `false`       | Do not output anything.                                           |

`FILE_<name>_PATH` and either `FILE_<name>_CONTENT` or `FILE_<name>_URL` are required.

### Possible Modes

| Mode      | Description                                                            | Needs `CONTENT` or `URL`                              |
|-----------|------------------------------------------------------------------------|-------------------------------------------------------|
| `create`  | Creates the file if it does not exist.                                 | Yes                                                   |
| `update`  | Updates the file if it exists.                                         | Yes                                                   |
| `upsert`  | Updates the file if it exists, otherwise creates it.                   | Yes                                                   |
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
| `npm`     | Downloads the content of an npm package.                               | Yes, but only content will be accepted.               |
| `cp`      | Copies the content of a file.                                          | Yes, but content will be handled as a path to a file. |

`mkdir`, `perm`, `permr` and `delete` do not accept `FILE_<name>_CONTENT` or `FILE_<name>_URL`.

## Example

```yml
services:
  web:
    image: httpd:2
    depends_on:
      cfg:
        condition: service_completed_successfully
    volumes:
      - data:/var/www/html

  cfg:
    image: ghcr.io/scolastico-dev/s.containers/compose-file-loader:latest
    restart: 'no'
    volumes:
      - data:/mnt/data
    environment:
      ORDER: CONFIG,KEYS
      SLEEP_AFTER: 0
      FILE_CONFIG_MODE: upsert
      FILE_CONFIG_PATH: /mnt/data/config.json
      FILE_CONFIG_OVERRIDES_USER: 1001
      FILE_CONFIG_OVERRIDES_GROUP: 1001
      FILE_CONFIG_OVERRIDES_PERMISSIONS: 600
      FILE_CONFIG_CONTENT: |
        {
        "foo": "bar"
        }
      FILE_KEYS_MODE: create
      FILE_KEYS_PATH: /mnt/data/keys.txt
      FILE_KEYS_URL: https://raw.githubusercontent.com/scolastico-dev/s.containers/master/src/compose-file-loader/README.md

volumes:
  data:
```
