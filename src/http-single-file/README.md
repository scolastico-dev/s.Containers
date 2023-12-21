# `s.containers/http-single-file`

### [Back to index](../../README.md)

## Why?

The `s.containers/http-single-file` module is an efficient and streamlined solution for serving specific files in a containerized environment. This tool is particularly useful in scenarios where only a single file, such as a static HTML page or a CSS stylesheet, needs to be served over HTTP. Its primary use case is in microservices architectures or as a lightweight component in larger systems, where deploying a full web server for a single file is unnecessary and resource-intensive.

A common application of this module is for CSS overrides in web applications. By serving a custom CSS file, developers can easily implement style changes or theme customizations without altering the main application code. This approach is beneficial for quick updates, A/B testing, or providing theme options to end-users.

## Environment Variables

| Name                        | Type   | Default Value | Description                                             |
|-----------------------------|--------|---------------|---------------------------------------------------------|
| `FILE_PATH`                 | string | `null`        | The file path inside the container.                     |
| `FILE_CONTENT`              | string | `null`        | The content of the file to serve.                       |
| `FILE_TYPE`                 | string | `text/plain`  | The MIME type of the file.                              |
| `MERGE_URL`                 | string | `null`        | The URL to merge with the content.                      |
| `MERGE_FILE`                | string | `null`        | The file to merge with the content.                     |
| `MERGE_METHOD`              | enum   | `append`      | The merge method.                                       |
| `MERGE_DYNAMIC_URL`         | string | `null`        | Whether to use the path which was requested in the url. |
| `MERGE_DYNAMIC_METHOD`      | enum   | `append`      | The merge method.                                       |
| `MERGE_DYNAMIC_CACHE_TIME`  | number | `60`          | The cache time in seconds.                              |
| `MERGE_DYNAMIC_CACHE_COUNT` | number | `0`           | The maximum length of the cache object.                 |
| `PORT`                      | number | `3000`        | The port to bind to.                                    |

Either `FILE_PATH` or `FILE_CONTENT` is required.

Only one of `MERGE_URL` or `MERGE_FILE` will be applied, file takes precedence over URL.

If `MERGE_DYNAMIC_URL` is set to `http://example.com` and the server receives a request to `/main.css` the URL will be `http://example.com/main.css`.

### Merge Methods

| Name     | Description                                                                 |
|----------|-----------------------------------------------------------------------------|
| `append` | Appends the file content to th end of the merge file.                       |
| `prepend`| Prepends the file content to the beginning of the merge file.               |

## Example

```yaml
version: "3"
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/http-single-file:latest
    ports:
      - "3000:3000"
    environment:
      - FILE_PATH=/app/index.html
    volumes:
      - ./index.html:/app/index.html
```

or for traefik:

```yaml
version: "3"
  app:
    image: my-example-container
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`example.com`)"
      - "traefik.http.routers.app.entrypoints=websecure"
      - "traefik.http.routers.app.tls.certresolver=myresolver"
  custom-css:
    depends_on:
      - app
    image: ghcr.io/scolastico-dev/s.containers/http-single-file:latest
    environment:
      - MERGE_URL=http://app:3000/main.css
      - FILE_TYPE=text/css
      - FILE_CONTENT: |
          body {
            background-color: red;
          }
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.custom-css.rule=Host(`example.com`) && PathPrefix(`/main.css`)"
      - "traefik.http.routers.custom-css.entrypoints=websecure"
      - "traefik.http.routers.custom-css.tls.certresolver=myresolver"
      - "traefik.http.services.custom-css.loadbalancer.server.port=3000"
      - "traefik.http.services.custom-css.loadbalancer.server.scheme=http"
```
