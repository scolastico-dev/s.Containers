# `s.containers/hastebin`

### [Back to index](../../README.md)

## Why?

Sometimes you need to share a snippet of code with someone,
but you don't want to send them a whole file. Hastebin is a
simple, lightweight pastebin that allows you to share snippets
of code with others.

## How?

Big thank you to [@jacklei](https://github.com/jacklei) for the
base docker file. Please also check out his original code
[repo](https://github.com/jacklei/hastebin). I slightly modified
it and included it in this repo for convenience. (I don't like
building docker images every time I want to use them)

## Environment Variables

| Name                       | Type    | Default Value | Description                                                    |
|----------------------------|---------|---------------|----------------------------------------------------------------|
| `HOST`                     | string  | `0.0.0.0`     | The host to bind to.                                           |
| `PORT`                     | number  | `7777`        | The port to bind to.                                           |
| `KEY_LENGTH`               | number  | `10`          | The length of the key to generate.                             |
| `MAX_LENGTH`               | number  | `400000`      | The maximum length of a paste.                                 |
| `STATIC_MAX_AGE`           | number  | `86400`       | The maximum age of static files.                               |
| `RECOMPRESS_STATIC_ASSETS` | boolean | `true`        | Whether to re-compress static assets.                          |
| `LOGGING_LEVEL`            | string  | `verbose`     | The logging level.                                             |
| `LOGGING_TYPE`             | string  | `Console`     | The logging type.                                              |
| `LOGGING_COLORIZE`         | boolean | `false`       | Whether to colorize the logging output.                        |
| `KEY_GENERATOR_TYPE`       | string  | `phonetic`    | The key generator type.                                        |
| `STORAGE_TYPE`             | string  | `redis`       | The storage type.                                              |
| `STORAGE_PATH`             | string  | `./data`      | The storage path.                                              |
| `STORAGE_HOST`             | string  | `0.0.0.0`     | The storage host.                                              |
| `STORAGE_PORT`             | number  | `6379`        | The storage port.                                              |
| `STORAGE_DB`               | number  | `2`           | The storage database.                                          |
| `STORAGE_EXPIRE`           | number  | `2592000`     | The storage expire time.                                       |
| `DOCUMENTS`                | string  | `null`        | The documents to serve.                                        |

See the [hastebin](https://github.com/toptal/haste-server) repo for more information.

## Example

```yaml
version: "3"
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/hastebin:latest
    depends_on:
      - redis
    environment:
      STORAGE_TYPE: redis
      STORAGE_HOST: redis
    ports:
      - "7777:7777"

  redis:
    image: redis
    volumes:
      - db:/data
    entrypoint: redis-server --appendonly yes

volumes:
  db:
```
