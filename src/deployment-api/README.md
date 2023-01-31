# `s.containers/deployment-api`
### [Back to index](../../README.md)

## Why?
For every small website a container is overkill. This image will
enable you to use for example httpd or nginx to serve your website
and enable you an easy way to deploy your website directly to the container.

Sure there are other ways like sftp or rsync but a simple post request with a zip file is much easier.

## Environment Variables
| Name                                         | Type   | Default Value | Description                              |
|----------------------------------------------|--------|---------------|------------------------------------------|
| `PORT`                                       | number | `3000`        | The port to bind to.                     |
| `MD5_ITERATIONS`                             | number | `50`          | The number of iterations to perform MD5. |
| `APP_LOCATIONS_<name>_PATH`                  | string | `null`        | The path of the location.                |
| `APP_LOCATIONS_<name>_OVERRIDES_USER`        | number | `null`        | The user override value.                 |
| `APP_LOCATIONS_<name>_OVERRIDES_GROUP`       | number | `null`        | The group override value.                |
| `APP_LOCATIONS_<name>_OVERRIDES_PERMISSIONS` | number | `null`        | The permissions override value.          |
| `APP_LOCATIONS_<name>_KEY_TYPE`              | string | `key`         | The key type. (key or md5)               |
| `APP_LOCATIONS_<name>_KEY_SECRET`            | string | `null`        | The secret value.                        |

## Example
```yaml
version: "3"
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/deployment-api:latest
    volumes:
      - data:/data
    environment:
      APP_LOCATIONS_WEB_PATH: /data
      APP_LOCATIONS_WEB_KEY_TYPE: md5
      APP_LOCATIONS_WEB_KEY_SECRET: 0000-0000-0000-0000-0000-0000-0000
      APP_LOCATIONS_WEB_OVERRIDES_USER: 1000
      APP_LOCATIONS_WEB_OVERRIDES_GROUP: 1000
      APP_LOCATIONS_WEB_OVERRIDES_PERMISSIONS: 777
      MD5_ITERATIONS: 100
    ports:
      - "3000:3000"

  web:
    image: httpd:2
    volumes:
      - data:/var/www/html

volumes:
  data:
```

To deploy a zip file use this command as a reference:
```bash
# Make the initial GET request to retrieve the "otp" string from the JSON response
otp=$(curl -s "deploy.example.com" | jq -r '.otp') && \

# Concatenate the "otp" with a string of zeros
hash_input="$otp-0000-0000-0000-0000-0000-0000-0000" && \

# Hash the concatenated string 100 times using MD5
for i in $(seq 1 100); do hash_input=$(echo -n "$hash_input" | md5sum | awk '{print $1}'); done && \

# Make the final POST request to upload the file "deployment.zip"
curl -X POST "deploy.example.com/web/$hash_input" \
  -F "zip=@deployment.zip"
```

Or in short:
```bash
otp=$(curl -s "deploy.example.com" | jq -r .otp) && echo -n $otp'0000-0000-0000-0000-0000-0000-0000' | tr -d '\n' | openssl dgst -md5 -binary | openssl dgst -md5 -binary | base64 | head -c 32 | (for i in {1..100}; do echo -n $REPLY | openssl dgst -md5 -binary | base64; done) | tail -c 32 && curl -X POST -F "zip=@deployment.zip" "deploy.example.com/web/$REPLY"
```

You could also skip the hashing for a less secure but easier way:
```yaml
# [...]
    environment:
      APP_LOCATIONS_WEB_PATH: /data
      APP_LOCATIONS_WEB_KEY_TYPE: key # <-- Change this to "key" or remove it
      APP_LOCATIONS_WEB_KEY_SECRET: 0000-0000-0000-0000-0000-0000-0000
# [...]
```

And then use this command:

```bash
curl -X POST "deploy.example.com/web/0000-0000-0000-0000-0000-0000-0000" -F "zip=@deployment.zip"
```

**Note:** `jq` and `openssl` are required for this command.
