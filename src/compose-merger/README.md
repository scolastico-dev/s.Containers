# `s.containers/compose-merger`

### [Back to index](../../README.md)

## Why?

With the Docker Compose v`>=2.20` the includes are introduced. This is a great feature, tho some deployments still require a single file. This container merges multiple files into one.

## Arguments

| Name          | Type   | Default Value       | Description                                                                 |
| ------------- | ------ | ------------------- | --------------------------------------------------------------------------- |
| `-i`          | string | `/data/compose.yml` | The input file.                                                             |
| `-o`          | string | `null`              | The output file. If not set, the output will be written to stdout.          |
| `-d`          | bool   | `false`             | Debug mode.                                                                 |

## Example

Read from `compose.yml` and write to `compose.merged.yml` with read only mounted volume:

```bash
docker run --rm -v "$(pwd):/data:ro" ghcr.io/scolastico-dev/s.containers/compose-merger > compose.merged.yml
```

Read from `comose.yml` and write to `compose.merged.yml`:

```bash
docker run --rm -v "$(pwd):/data" ghcr.io/scolastico-dev/s.containers/compose-merger -o /data/compose.merged.yml
```

Read from `docker-compose.yml` and write to `docker-compose-merged.yml`:

```bash
docker run --rm -v "$(pwd):/data" ghcr.io/scolastico-dev/s.containers/compose-merger -i /data/docker-compose.yml -o /data/docker-compose-merged.yml
```
