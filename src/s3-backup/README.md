# `s.containers/s3-backup`

### [Back to index](../../README.md)

## Why?

A easy to use backup container, which can backup folders, or docker volumes to s3 compatible storage. Basically its a wrapper around a cron job which will create a tar.gz file and upload it to the s3 compatible storage. If wanted it can also ping a webhook after the backup is done (e.g. to create a heartbeat health check with for example [Uptime-Kuma](https://github.com/louislam/uptime-kuma)).

The container does intentionally not support cleaning up old backups, as this should be done by the s3 compatible storage itself.

## Environment Variables

| Name                            | Type   | Default Value | Required | Description                                                               |
|---------------------------------|--------|---------------|----------|---------------------------------------------------------------------------|
| `CFG_{counter}_FROM`            | string | `null`        | yes      | The path to backup.                                                       |
| `CFG_{counter}_BUCKET`          | string | `null`        | yes      | The name of the bucket to upload the backup to.                           |
| `CFG_{counter}_ACCESS_KEY`      | string | `null`        | yes      | The access key to authenticate with the s3 compatible storage.            |
| `CFG_{counter}_SECRET_KEY`      | string | `null`        | yes      | The secret key to authenticate with the s3 compatible storage.            |
| `CFG_{counter}_REGION`          | string | `null`        | yes      | The region of the s3 compatible storage.                                  |
| `CFG_{counter}_ENDPOINT`        | string | `null`        | yes      | The endpoint of the s3 compatible storage.                                |
| `CFG_{counter}_CRON`            | string | `null`        | yes      | The cron schedule for the backup.                                         |
| `CFG_{counter}_WEBHOOK_SUCCESS` | string | `null`        | no       | The webhook to ping after the backup is done.                             |
| `CFG_{counter}_WEBHOOK_FAILURE` | string | `null`        | no       | The webhook to ping after the backup failed.                              |
| `CFG_{counter}_CONTAINER`       | string | `null`        | no       | The container names to stop before the backup and start after the backup. |
| `CFG_{counter}_PREFIX`          | string | `null`        | no       | The prefix for the backup file.                                           |
| `CFG_{counter}_ENCRYPTION_KEY`  | string | `null`        | no       | The RSA public key to encrypt the backup file.                            |

## Example

```yaml
version: "3"
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/s3-backup:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/backup
    environment:
      CFG_0_FROM: "/backup"
      CFG_0_BUCKET: "your-bucket"
      CFG_0_ACCESS_KEY: "your-access-key"
      CFG_0_SECRET_KEY: "your-secret-key"
      CFG_0_REGION: "your-region"
      CFG_0_ENDPOINT: "your-endpoint"
      CFG_0_CRON: "0 0 * * *"
      CFG_0_WEBHOOK_SUCCESS: "https://uptime.example.com/your-token"
      CFG_0_CONTAINER: "your-container-name1,your-container-name2"
      CFG_0_PREFIX: "my-backup-dir/"
      CFG_0_ENCRYPTION_KEY: |
        -----BEGIN RSA PUBLIC KEY-----
        MEgCQQCo9+BpMRYQ/dL3DS2CyJxRF+j6ctbT3/Qp84+KeFhnii7NT7fELilKUSnx
        ...
        -----END RSA PUBLIC KEY-----
```
