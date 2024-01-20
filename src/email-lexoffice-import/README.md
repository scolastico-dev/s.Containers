# `s.containers/email-lexoffice-import`

### [Back to index](../../README.md)

## Why?

This is an simple tool which logs into your email account and imports all invoices into lexoffice.

## Environment Variables

| Name                                | Type   | Default Value | Description                                                       |
|-------------------------------------|--------|---------------|-------------------------------------------------------------------|
| `INPUT_<name>_MAIL`                 | string | `null`        | An sender email address to filter for.                            |
| `INPUT_<name>_MODE`                 | string | `null`        | The mode to use, see below.                                       |
| `IMAP_HOST`                         | number | `null`        | The IMAP host.                                                    |
| `IMAP_USER`                         | string | `null`        | The IMAP user.                                                    |
| `IMAP_PASSWORD`                     | bool   | `null`        | The IMAP password.                                                |
| `IMAP_TLS`                          | bool   | `true`        | Whether to use TLS.                                               |
| `IMAP_PORT`                         | number | `993`         | The IMAP port.                                                    |
| `LEXOFFICE_KEY`                     | string | `null`        | The lexoffice API key.                                            |
| `SCHEDULER`                         | number | `0 */3 * * *` | The scheduler to use, cron syntax.                                |

### Possible Modes

| Mode           | Description                                                            |
|----------------|------------------------------------------------------------------------|
| `just-upload`  | Just uploads the invoice as a voucher to lexoffice.                    |

## Example

```yml
version: "3"
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/email-lexoffice-import:latest
    restart: unless-stopped
    environment:
      INPUT_FOO_MAIL: foo@bar.com
      INPUT_BAR_MAIL: bar@foo.com
      IMAP_HOST: imap.gmail.com
      IMAP_USER: invoices@gmail.com
      IMAP_PASSWORD: mypassword
      LEXOFFICE_KEY: mylexofficekey
```
