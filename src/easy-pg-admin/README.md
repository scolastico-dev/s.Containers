# `s.containers/easy-pg-admin`

### [Back to index](../../README.md)

## Why?

Easy pgAdmin wraps the [pgadmin4](https://www.pgadmin.org/) docker container and
adds a new startup routine to automatically configure a a server, and disable the
authentication of pgAdmin. This is useful for development environments.

## Environment Variables

| Name                  | Type   | Default Value      | Description                                                                                            |
| --------------------- | ------ | ------------------ | ------------------------------------------------------------------------------------------------------ |
| `PG_HOST`             | string | n/a                | The host of the PostgreSQL server.                                                                     |
| `PG_PORT`             | number | `5432`             | The port of the PostgreSQL server.                                                                     |
| `PG_USER`             | string | `postgres`         | The user of the PostgreSQL server.                                                                     |
| `PG_PASSWORD`         | string | `postgres`         | The password of the PostgreSQL server.                                                                 |
| `SERVER_JSON`         | string | n/a                | The server configuration in JSON format.                                                               |

Either the `PG_*` variables or the `SERVER_JSON` variable must be set.

## Example

```yaml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/easy-pg-admin:latest
    ports:
      - "8080:80"
    environment:
      PG_HOST: db
  db:
    image: postgres:12
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
```
