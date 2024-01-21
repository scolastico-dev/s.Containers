# `s.containers/email-lexoffice-import`

### [Back to index](../../README.md)

## Why?

This is an simple tool which logs into your email account and imports all invoices into lexoffice.

## Environment Variables

| Name                                | Type   | Default Value | Description                                                                  | Required |
|-------------------------------------|--------|---------------|------------------------------------------------------------------------------|----------|
| `INPUT_<name>_MAIL`                 | string | `null`        | An sender email address to filter for. A single '*' to match all is allowed. | yes      |
| `INPUT_<name>_MODE`                 | string | `null`        | The mode to use, see below.                                                  | no       |
| `IMAP_HOST`                         | string | `null`        | The IMAP host.                                                               | yes      |
| `IMAP_USER`                         | string | `null`        | The IMAP user.                                                               | yes      |
| `IMAP_PASSWORD`                     | string | `null`        | The IMAP password.                                                           | yes      |
| `IMAP_TLS`                          | bool   | `true`        | Whether to use TLS.                                                          | yes      |
| `IMAP_TRUST_TLS`                    | bool   | `true`        | Whether to trust untrusted TLS certificates.                                 | yes      |
| `IMAP_PORT`                         | number | `993`         | The IMAP port.                                                               | yes      |
| `SMTP_HOST`                         | string | `null`        | The SMTP host.                                                               | no       |
| `SMTP_USER`                         | string | `null`        | The SMTP user.                                                               | no       |
| `SMTP_PASSWORD`                     | string | `null`        | The SMTP password.                                                           | no       |
| `SMTP_TLS`                          | bool   | `true`        | Whether to use TLS.                                                          | no       |
| `SMTP_TRUST_TLS`                    | bool   | `true`        | Whether to trust untrusted TLS certificates.                                 | no       |
| `SMTP_PORT`                         | number | `587`         | The SMTP port.                                                               | no       |
| `LEXOFFICE_KEY`                     | string | `null`        | The lexoffice API key.                                                       | yes      |
| `SCHEDULER`                         | string | `0 */3 * * *` | The scheduler to use, cron syntax or 'now' for just one execution.           | no       |
| `REDIRECT_UNPARSABLE`               | string | `null`        | The email address to redirect unparsable emails to. Requires SMTP.           | no       |

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
      # INPUT_ALL_MAIL: '*' # Match all
      INPUT_FOO_MAIL: *@foo.com
      INPUT_BAR_MAIL: foo@bar.com
      IMAP_HOST: imap.gmail.com
      IMAP_USER: invoices@gmail.com
      IMAP_PASSWORD: mypassword
      LEXOFFICE_KEY: mylexofficekey
```
