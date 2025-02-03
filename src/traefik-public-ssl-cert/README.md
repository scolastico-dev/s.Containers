# `s.containers/traefik-public-ssl-cert`

### [Back to index](../../README.md)

## Why?

This container **EXPOSES** a certificate from a traefik container to an HTTP API.
Be aware that this should be used with caution, as this can easily lead to security issues.

I only see two reasons why you should use this container:

- You have a private network which can not be accessed from the outside and you want to easily share the certificate with other containers.
- You have a DNS record pointing to `127.0.0.1` for local development with https, without the need to trust a self signed certificate.

## Environment Variables

| Name          | Type   | Default Value       | Description                                                                 |
| ------------- | ------ | ------------------- | --------------------------------------------------------------------------- |
| `STORE_PATH`  | string | `/data/acme.json`   | The path to the acme storage file.                                          |
| `DOMAIN`      | string | `null`              | The domain to expose the certificate.                                       |

The `DOMAIN` variable is required is the equivalent of the `dns.Certificates[].domain.main` in the acme storage file.

## Example

If you want to expose a certificate for a local development domain,
you can deploy this on a public server:

```yml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/traefik-public-ssl-cert:latest
    restart: unless-stopped
    environment:
      DOMAIN: "*.local.example.com"
    volumes:
      - certs:/data:ro
    labels:
      - traefik.enable=true
      - traefik.http.routers.local-ssl.rule=Host(`local.example.com`)
      - traefik.http.routers.local-ssl.tls.certresolver=dns
      - traefik.http.routers.local-ssl.tls.domains[0].main=local.example.com
      - traefik.http.routers.local-ssl.tls.domains[0].sans=*.local.example.com
      - traefik.http.services.local-ssl.loadbalancer.server.port=3000
  traefik:
    image: traefik:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - data:/data
    command:
      - --providers.docker
      - --providers.docker.exposedbydefault=false
      - --entrypoints.http.address=:80
      - --entrypoints.https.address=:443
      - --certificatesresolvers.dns.acme.email=acme@example.com
      - --certificatesresolvers.dns.acme.storage=/data/acme.json
      - --certificatesresolvers.dns.acme.dnschallenge=true
      - --certificatesresolvers.dns.acme.dnschallenge.provider=cloudflare
    environment:
      CF_DNS_API_TOKEN: <YOUR_CLOUDFLARE_API_TOKEN>
volume:
  data:
```

And use this locally with:

```yml
services:
  traefik:
    image: traefik:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - crt:/data:ro
      - cfg:/data/dynamic:ro
    command:
      - --providers.docker
      - --providers.docker.exposedbydefault=false
      - --providers.file.directory=/data/dynamic
      - --entrypoints.http.address=:80
      - --entrypoints.https.address=:443
    depends_on:
      cfg:
        condition: service_completed_successfully
  cfg:
    image: ghcr.io/scolastico-dev/s.containers/compose-file-loader:latest
    restart: 'no'
    volumes:
      - crt:/data
      - cfg:/data/dynamic
    environment:
      FILE_KEY_MODE: upsert
      FILE_KEY_PATH: /data/key.pem
      FILE_KEY_URL: https://local.example.com/key.pem
      FILE_CERT_MODE: upsert
      FILE_CERT_PATH: /data/cert.pem
      FILE_CERT_URL: https://local.example.com/cert.pem
      FILE_CFG_MODE: upsert
      FILE_CFG_PATH: /data/dynamic/tls.yml
      FILE_CFG_CONTENT: |
        tls:
          stores:
            default:
              defaultCertificate:
                certFile: /data/cert.pem
                keyFile: /data/key.pem
          certificates:
            - certFile: /data/cert.pem
              keyFile: /data/key.pem

volumes:
  crt:
  cfg:
```
