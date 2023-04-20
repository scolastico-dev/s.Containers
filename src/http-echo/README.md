# `s.containers/http-echo`
### [Back to index](../../README.md)

## Why?
HTTP Echo is a straightforward HTTP server that promptly returns the
request it receives, making it highly beneficial for debugging and
testing purposes. This is particularly advantageous in scenarios where
there is a complex infrastructure involving SSL termination and
authentication, as the service accurately responds with all the
headers and the body it has received.

## Example
```yaml
version: "3"
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/http-echo:latest
    ports:
      - "3000:3000"
```

or

```bash
docker run --rm --name http-echo -p 3000:3000 ghcr.io/scolastico-dev/s.containers/http-echo:latest
```
