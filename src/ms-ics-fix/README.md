# `s.containers/ms-ics-fix`

### [Back to index](../../README.md)

## Why?

In the vast sea of tools from the company that brought us VSCode and GitHub, there lurks Microsoft 365/Outlook—a product seemingly riddled with peculiarities. Among its quirks is the notoriously broken calendar export feature, an issue that has persisted for years, frustrating users and developers alike.

### Understanding the Problem

Microsoft Outlook exports calendar events in ICS format, which, quite ironically, often fail to adhere to the very standards intended to ensure compatibility and functionality across calendar applications. Specifically, the exports often mishandle timezones in a way that violates [RFC 5545](https://www.ietf.org/rfc/rfc5545)

```yml
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Microsoft Corporation//Outlook 16.0 MIMEDIR//EN
METHOD:PUBLISH
BEGIN:VTIMEZONE
TZID:Romance Standard Time
END:VTIMEZONE
BEGIN:VTIMEZONE
TZID:UTC
# ...
END:VTIMEZONE
BEGIN:VEVENT
# Event uses a different timezone, not properly linked to any defined VTIMEZONE
DTSTART;TZID=Central Europe Standard Time:20240425T113000 # Uses TZID without proper global reference,
DTEND;TZID=Central Europe Standard Time:20240425T120000   # likely to fail in non-Microsoft apps
# ...
END:VEVENT
END:VCALENDAR
```

And this is not a one time issue, see:

- [answers.microsoft.com/[...]/published-outlook-calendar-ics-link-shows-wrong](https://answers.microsoft.com/en-us/outlook_com/forum/all/published-outlook-calendar-ics-link-shows-wrong/5de6c55d-9c46-4e67-ab6a-27873d1bf636)
- [answers.microsoft.com/[...]/outlookcom-calendar-publishing-ics-link-shows-the](https://answers.microsoft.com/en-us/outlook_com/forum/all/outlookcom-calendar-publishing-ics-link-shows-the/44fc0725-fc98-4871-94fc-4799657ed05c)
- [techcommunity.microsoft.com/[...]/calendar-incorrectly-reading-ics-file-time-and-timezone-are](https://techcommunity.microsoft.com/t5/microsoft-365/calendar-incorrectly-reading-ics-file-time-and-timezone-are/m-p/254129)
- [support.google.com/[...]/events-imported-from-outlook-ics-feed-show-wrong-time-zone](https://support.google.com/calendar/thread/253308528/events-imported-from-outlook-ics-feed-show-wrong-time-zone?hl=en)
- [answers.microsoft.com/[...]/published-calendar-events-show-incorrect-time-when](https://answers.microsoft.com/en-us/outlook_com/forum/all/published-calendar-events-show-incorrect-time-when/c8e60444-1d02-45e1-a356-486f5a9370fc)
- [answers.microsoft.com/[...]/incorrect-timezone-when-subscribed-to-calendar](https://answers.microsoft.com/en-us/outlook_com/forum/all/incorrect-timezone-when-subscribed-to-calendar/c20444c1-df78-471d-9524-702f448c7c63)

To fix this, this tool will work like an ICS proxy, which will re- parse the ICS file.

## Environment Variables

| Name                        | Type    | Default Value | Description                                             |
|-----------------------------|---------|---------------|---------------------------------------------------------|
| `ICS_ON_DEMAND`             | boolean | `false`       | Whether to enable the on demand mode.                   |
| `ICS_{counter}_URL`         | string  | `null`        | The URL of the ICS file to serve.                       |
| `ICS_{counter}_PATH`        | string? | `null`        | The path to serve the ICS file.                         |
| `REPLACE_{counter}_FROM`    | string  | `null`        | The string to replace in the ICS file.                  |
| `REPLACE_{counter}_TO`      | string  | `null`        | The string to replace the string from with.             |

## On Demand Mode

If `ICS_ON_DEMAND` is set to `true`, you can make a GET request to `/` with the query parameter `url`.

```http
/?url=https%3A%2F%2Fexample.com%2Fcalendar.ics
```

This will return the ICS file from `https://example.com/calendar.ics`.

**Don't forget to URL encode the query parameter.**

## Example

```yaml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/ms-ics-fix:latest
    ports:
      - "3000:3000"
    environment:
      ICS_0_URL: "https://example.com/calendar1.ics"
      ICS_0_PATH: "your-new-filename-which-will-be-served.ics"
      ICS_1_URL: "https://example.com/calendar2.ics"
      # ...
      REPLACE_0_FROM: "Romance Standard Time"
      REPLACE_0_TO: "Europe/Paris"
      # ...
```

This will result in to paths being published:

- `GET` `/your-new-filename-which-will-be-served.ics` -> `https://example.com/calendar1.ics`
- `GET` `/0.ics` -> `https://example.com/calendar2.ics`

If no path is specified, the tool will try to use `{counter}.ics`, starting with `0` and incrementing by `1` for each new ICS file. If another file blocks the counter, the tool will skip the counter and try the next one.
