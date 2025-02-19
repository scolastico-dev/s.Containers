# `s.containers/github-commit-hash-expose`

### [Back to index](../../README.md)

## Why?

Expose the latest commit hash of a GitHub repository's default branch via a simple API, with optional hashing and caching.

## Environment Variables

| Name                     | Type   | Default Value | Description                                                             |
| ------------------------ | ------ | ------------- | ----------------------------------------------------------------------- |
| `CFG_<ORG>_PAT`          | string | `null`        | The GitHub Personal Access Token (PAT) for the given organization.      |
| `CFG_<ORG>_TTL`          | int    | `3600`        | The cache duration in seconds.                                          |
| `CFG_<ORG>_SALT`         | string | `null`        | Optional salt for hashing the commit hash.                              |
| `PORT`                   | int    | `3000`        | The port the service runs on.                                           |

The `<ORG>` placeholder should be replaced with the respective GitHub organization name in uppercase.

## API

The API is available at `/<ORG>/<REPO>` and returns a `text/plain` response
with the latest commit hash of the default branch of the given repository.

## Example

```yml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/github-commit-hash-expose:latest
    restart: unless-stopped
    environment:
      CFG_MYORG_PAT: YOUR_GITHUB_PAT
      CFG_MYORG_TTL: 3600
      CFG_MYORG_SALT: my-secret-salt
    ports:
      - 3000:3000
```
