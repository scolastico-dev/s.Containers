# `s.containers/form-api`

### [Back to index](../../README.md)

## Why?

Form API is a simple form to email service. It is a simple way to send form data to an email address. 

## Environment Variables

| Name                          | Type   | Default Value      | Description                                                                                            |
| ----------------------------- | ------ | ------------------ | ------------------------------------------------------------------------------------------------------ |
| `DISABLE_SWAGGER`             | bool   | `false`            | Whether to disable the swagger documentation.                                                          |
| `ENABLE_DEBUG_ENDPOINT`       | bool   | `false`            | Whether to enable the debug endpoint.                                                                  |
| `SMTP_HOST`                   | string | `null`             | The SMTP host.                                                                                         |
| `SMTP_PORT`                   | number | `587`              | The SMTP port.                                                                                         |
| `SMTP_TLS`                    | bool   | `true`             | Whether to use TLS.                                                                                    |
| `SMTP_TLS_CHECK`              | bool   | `true`             | Whether to check the TLS certificate.                                                                  |
| `SMTP_USER`                   | string | `null`             | The SMTP user.                                                                                         |
| `SMTP_FROM`                   | string | `$SMTP_USER`       | The SMTP from address.                                                                                 |
| `SMTP_PASSWORD`               | string | `null`             | The SMTP password.                                                                                     |
| `CAPTCHA_VERIFY_IP`           | bool   | `true`             | Whether to verify the ip address of the captcha response.                                              |
| `ALLOW_FORWARDED_FOR`         | bool   | `false`            | Whether to allow the `X-Forwarded-For` header to be used as the ip address.                            |
| `CFG_<name>_EMAIL`            | string | `null`             | The email address to send the form data to.                                                            |
| `CFG_<name>_SUBJECT`          | string | `Form-API: <name>` | The subject of the email.                                                                              |
| `CFG_<name>_CAPTCHA_SECRET`   | string | `null`             | The secret of the captcha. If no captcha strength is chosen the captcha is expected to be a reCAPTCHA. |
| `CFG_<name>_CAPTCHA_GENERATE` | bool   | `false`            | Whether to generate a captcha.                                                                         |
| `CFG_<name>_MAX_SIZE`         | number | `1000000`          | The maximum size of the form data.                                                                     |
| `CFG_<name>_JSON_SCHEMA`      | string | `null`             | The JSON schema to validate the form data.                                                             |
| `CFG_<name>_JSON_SCHEMA_URL`  | string | `null`             | The URL to fetch the JSON schema from.                                                                 |

The captcha secret is optional and can be used to verify a [Google reCAPTCHA](https://developers.google.com/recaptcha) response. The captcha secret is used to verify the response. The captcha secret can be set in the [Google reCAPTCHA admin console](https://www.google.com/recaptcha/admin/create).

If the `CFG_<name>_CAPTCHA_GENERATE` is set to `true` a captcha is locally generated, see [config.type.ts](./src/captcha/config.type.ts) for the configuration options.

## API's

Visit the `/` endpoint to see a swagger documentation of the API, if the `DISABLE_SWAGGER` environment variable is not set to `true`.

## Example

```yaml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/form-api:latest
    environment:
      SMTP_HOST: smtp.example.com
      SMTP_USER: admin@example.com
      SMTP_PASSWORD: password

      CFG_CONTACT_EMAIL: contact@example.com
      CFG_CONTACT_SUBJECT: Contact Form Submission
      CFG_CONTACT_CAPTCHA_SECRET: secret
      CFG_CONTACT_CAPTCHA_STRENGTH: 3
```
