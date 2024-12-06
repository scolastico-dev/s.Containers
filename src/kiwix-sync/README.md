# `s.containers/kiwix-sync`

### [Back to index](../../README.md)

## Why?

This container is a simple script which periodically downloads the latest
version of a file found at a given file server, with enabled index listing.

The original intent where mainly Kiwix ZIM files, but it can be used for any
file as long as it uses the apache index listing.

## Environment Variables

| Name                            | Type   | Default Value   | Required | Description                                                                     |
|---------------------------------|--------|-----------------|----------|---------------------------------------------------------------------------------|
| `CFG_URL`                       | string | `null`          | yes      | The base URL to fetch the file from.                                            |
| `CFG_FILE`                      | string | `null`          | yes      | The regex pattern to match the file to download.                                |
| `CFG_ORDER`                     | string | `desc`          | no       | Sort order for selecting the file if multiple are found (`asc` or `desc`).      |
| `CFG_EXPIRES`                   | number | `8760`          | no       | Time in hours after which the file needs to be re-downloaded.                   |
| `CFG_OUTPUT`                    | string | `/out/wiki.zim` | no       | The output file path where the downloaded file will be saved.                   |
| `CFG_TIME_FILE`                 | string | `null`          | no       | Path to a file that stores the last download timestamp. Used for expiry checks. |
| `CFG_NAME_FILE`                 | string | `null`          | no       | Path to a file that stores the name of the downloaded file.                     |
| `CFG_CONTAINER`                 | string | `null`          | no       | The Docker container name to restart after downloading the file.                |

The `CFG_NAME_FILE` is useful to prevent downloading the same file multiple times.

## Example

```yaml
x-restart: &restart
  restart: unless-stopped

services:
  serve:
    image: ghcr.io/kiwix/kiwix-serve:latest
    <<: *restart
    container_name: kiwix-serve
    command: wiki.zim
    volumes:
      - data:/data
    ports:
      - '8080:8080'

  sync:
    image: ghcr.io/scolastico-dev/s.containers/kiwix-sync:latest
    <<: *restart
    volumes:
      - data:/out
      - /var/run/docker.sock:/var/run/docker.sock # Required for container restart
    environment:
      CFG_URL: "https://download.kiwix.org/zim/wikipedia/"
      CFG_FILE: "wikipedia_en_all_maxi_[0-9]{4}-[0-9]{2}\\.zim" # ~ 100 GB
      CFG_CONTAINER: "kiwix-serve"
      CFG_TIME_FILE: "/out/.last_download"
      CFG_NAME_FILE: "/out/.last_name"

volumes:
  data:
```

See the [docker-compose.de-en.yml](./docker-compose.de-en.yml) for an example with multiple files and languages.
