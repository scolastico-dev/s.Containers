# `s.containers/dyn-redirect`

### [Back to index](../../README.md)

## Why?

A simple API which does HTTP 301 or 302 redirects based on settings provided
either by environment variables or a post request from external sources.

## Environment Variables

| Name                            | Type   | Default Value   | Required | Description                                                                     |
|---------------------------------|--------|-----------------|----------|---------------------------------------------------------------------------------|
| `CFG_<id>_PATH`                 | string | `null`          | yes      | The path to match for the redirect, expects a regex pattern.                    |
| `CFG_<id>_URL`                  | string | `null`          | yes      | The URL to redirect to.                                                         |
| `CFG_<id>_STATUS`               | number | `302`           | no       | The HTTP status code to use for the redirect.                                   |
| `CFG_<id>_SECRET`               | string | `null`          | no       | The secret to use for the post request.                                         |
| `DATA_DIR`                      | string | `/data`         | no       | The directory to store the data in.                                             |

## Example

```yaml
version: "3"

services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/dyn-redirect:latest
    restart: unless-stopped
    volumes:
      - data:/data
    ports:
      - '80:3000'
    environment:
      CFG_0_URL: "https://example.com"
      CFG_0_SECRET: "secret!"

      CFG_1_PATH: "test" # Match /test path
      CFG_1_URL: "https://example.com"

      CFG_2_PATH: "go\\/.*" # Match /go/* path
      CFG_2_URL: "https://example.com"
      CFG_2_STATUS: 301

volumes:
  data:
```

Use this command to update the redirect settings:

```bash
curl -X POST http://localhost:3000/ -H "Content-Type: application/json" -d '{"secret": "secret!", "url": "https://example.com/new-root"}'
```
