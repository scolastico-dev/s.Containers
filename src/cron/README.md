# `s.containers/cron`
### [Back to index](../../README.md)

## Why?
Setup and start cronjobs in a docker container. Very useful for docker compose stacks.

## Environment Variables
| Name           | Type   | Default Value | Description                                                    |
|----------------|--------|---------------|----------------------------------------------------------------|
| `CRON_TZ`      | string | `null`        | The timezone to use for the cron jobs.                         |
| `CRON_STARTUP` | string | `null`        | The command to execute on startup.                             |
| `JOB_` + name  | String | `null`        | [An crontab line](https://en.wikipedia.org/wiki/Cron#Overview) |

## Example
```yaml
version: "3"
services:
  cron:
    image: ghcr.io/scolastico-dev/s.containers/cron:latest
    environment:
      - CRON_TZ=Europe/Berlin
      - JOB_HELLO_WORLD_ONE=* * * * * echo "Hello World One!"
      - >-
        JOB_HELLO_WORLD_TWO=* * * * *
        echo "Hello World" &&
        echo "Two!"
```
