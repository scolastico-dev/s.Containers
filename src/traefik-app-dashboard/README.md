# `s.containers/traefik-app-dashboard`

### [Back to index](../../README.md)

## Why?

This container uses the traefik API to fetch all available services and generates a dashboard for them.

Never have to worry about documenting all your services again.

## Environment Variables

| Name           | Type   | Default Value         | Description                                                                      |
| -------------- | ------ | --------------------- | -------------------------------------------------------------------------------- |
| `IGNORE_REGEX` | string | `null`                | A regex to ignore services.                                                      |
| `TRAEFIK_API`  | string | `http://traefik:8080` | The URL to the traefik API.                                                      |

## Example

```yml

```
