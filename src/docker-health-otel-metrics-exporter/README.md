# `s.containers/docker-health-otel-metrics-exporter`

### [Back to index](../../README.md)

## Why?

Export the health of your Docker containers as OpenTelemetry metrics in a range from 2 (starting) to -2 (stopped).

## Environment Variables

| Name                     | Type   | Default Value           | Description                                                             |
| ------------------------ | ------ | ----------------------- | ----------------------------------------------------------------------- |
| `OTEL_URL`               | string | `http://localhost:4317` | The OpenTelemetry collector URL.                                        |
| `SCRAPER_INTERVAL`       | int    | `60`                    | The interval in seconds to scrape the Docker API.                       |

## States

| State | Description |
| ----- | ----------- |
| 2     | Starting    |
| 1     | Healthy     |
| 0     | Unhealthy   |
| -1    | Unknown     |
| -2    | Stopped     |

## Example

```yml
services:
  app:
    image: s.containers/docker-health-otel-metrics-exporter:latest
    restart: unless-stopped
    network_mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```
