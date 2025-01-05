# `s.containers/timeoff-management`

### [Back to index](../../README.md)

## Why?

This is a wrapper for the [TimeOff.Management](https://github.com/timeoff-management/timeoff-management-application) application, which is a simple way to manage time off requests.

## Environment Variables

| **Environment Variable**                                       | **Purpose**                                                                                          | **Default Value**                                  |
|----------------------------------------------------------------|------------------------------------------------------------------------------------------------------|---------------------------------------------------|
| `ALLOW_CREATE_NEW_ACCOUNTS`                                   | Enables or disables the ability to create new accounts.                                              | `true`                                            |
| `SEND_EMAILS`                                                 | Specifies whether emails should be sent.                                                            | `false`                                           |
| `APPLICATION_SENDER_EMAIL`                                    | Sets the sender email address for application-related emails.                                        | `email@test.com`                                  |
| `EMAIL_TRANSPORTER_HOST`                                      | Defines the host for the email transporter.                                                          | `localhost`                                       |
| `EMAIL_TRANSPORTER_PORT`                                      | Specifies the port for the email transporter.                                                        | `25`                                              |
| `EMAIL_TRANSPORTER_AUTH_USER`                                 | Sets the username for email transporter authentication.                                               | `user`                                            |
| `EMAIL_TRANSPORTER_AUTH_PASS`                                 | Sets the password for email transporter authentication.                                               | `pass`                                            |
| `GA_ANALYTICS_ON`                                             | Enables or disables Google Analytics tracking.                                                       | `false`                                           |
| `APPLICATION_DOMAIN`                                          | Defines the domain of the application.                                                               | `http://app.timeoff.management`                  |
| `PROMOTION_WEBSITE_DOMAIN`                                    | Specifies the domain for the promotion website.                                                      | `http://timeoff.management`                      |
| `LOCALE_CODE_FOR_SORTING`                                     | Sets the locale code for sorting purposes.                                                           | `en`                                              |
| `FORCE_TO_EXPLICITLY_SELECT_TYPE_WHEN_REQUESTING_NEW_LEAVE`   | Requires users to explicitly select a leave type when making new leave requests.                     | `false`                                           |

## Example

```yaml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/timeoff-management:latest
    restart: unless-stopped
    volumes:
      - db:/app/db
    ports:
      - 3000:3000
    environment:
      ALLOW_CREATE_NEW_ACCOUNTS: true
      SEND_EMAILS: true
      APPLICATION_SENDER_EMAIL: noreply@example.com
      EMAIL_TRANSPORTER_HOST: smtp.example.com
      EMAIL_TRANSPORTER_PORT: 587
      EMAIL_TRANSPORTER_AUTH_USER: noreply@example.com
      EMAIL_TRANSPORTER_AUTH_PASS: password
      APPLICATION_DOMAIN: http://app.example.com
      LOCATE_CODE_FOR_SORTING: de
      FORCE_TO_EXPLICITLY_SELECT_TYPE_WHEN_REQUESTING_NEW_LEAVE: true

volumes:
  db:
```
