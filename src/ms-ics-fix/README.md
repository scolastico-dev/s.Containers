# `s.containers/ms-ics-fix`

### [Back to index](../../README.md)

## Why?

The same company which owns vscode and github, also has a lot of other bullshit products.
One of them is Microsoft 365/Outlook. They have a calendar export feature, which is
broken for years now.

> ### 4.2.19 Time Zone Identifier
>
> // [...]<br><br>
> **Description**: The parameter MUST be specified on the "DTSTART",
> "DTEND", "DUE", "EXDATE" and "RDATE" properties when either a DATE-
> TIME or TIME value type is specified and when the value is not either
> a UTC or a "floating" time. Refer to the DATE-TIME or TIME value type
> definition for a description of UTC and "floating time" formats. This
> property parameter specifies a text value which uniquely identifies
> the "VTIMEZONE" calendar component to be used when evaluating the
> time portion of the property. The value of the TZID property
> parameter will be equal to the value of the TZID property for the
> matching time zone definition. An individual "VTIMEZONE" calendar
> component MUST be specified for each unique "TZID" parameter value
> specified in the iCalendar object.<br><br>
> // [...]<br>
> [RFC 2445](https://www.ietf.org/rfc/rfc2445.txt)

Key problem here is, that they are exporting ICS files, which are not RFC compliant.

```yml
# ...
TZID:UTC                          # Server indicates its using UTC
# ...
TZID:Central Europe Standard Time # Suddenly it indicates the correct timezone
# ...
BEGIN:VEVENT
# ...
DTSTAMP:20240101T130000Z          # Server using UTC, tho it said it uses CEST
# ...
END:VEVENT
# ...
```

And this is not a one time issue, see:

- [answers.microsoft.com/[...]/published-outlook-calendar-ics-link-shows-wrong](https://answers.microsoft.com/en-us/outlook_com/forum/all/published-outlook-calendar-ics-link-shows-wrong/5de6c55d-9c46-4e67-ab6a-27873d1bf636)
- [answers.microsoft.com/[...]/outlookcom-calendar-publishing-ics-link-shows-the](https://answers.microsoft.com/en-us/outlook_com/forum/all/outlookcom-calendar-publishing-ics-link-shows-the/44fc0725-fc98-4871-94fc-4799657ed05c)
- [techcommunity.microsoft.com/[...]/calendar-incorrectly-reading-ics-file-time-and-timezone-are](https://techcommunity.microsoft.com/t5/microsoft-365/calendar-incorrectly-reading-ics-file-time-and-timezone-are/m-p/254129)
- [support.google.com/[...]/events-imported-from-outlook-ics-feed-show-wrong-time-zone](https://support.google.com/calendar/thread/253308528/events-imported-from-outlook-ics-feed-show-wrong-time-zone?hl=en)
- [answers.microsoft.com/[...]/published-calendar-events-show-incorrect-time-when](https://answers.microsoft.com/en-us/outlook_com/forum/all/published-calendar-events-show-incorrect-time-when/c8e60444-1d02-45e1-a356-486f5a9370fc)
- [answers.microsoft.com/[...]/incorrect-timezone-when-subscribed-to-calendar](https://answers.microsoft.com/en-us/outlook_com/forum/all/incorrect-timezone-when-subscribed-to-calendar/c20444c1-df78-471d-9524-702f448c7c63)

To fix this, this tool will work like an ICS proxy, which will fix the timezone issue.

## Environment Variables

| Name                        | Type    | Default Value | Description                                             |
|-----------------------------|---------|---------------|---------------------------------------------------------|
| `ICS_ON_DEMAND`             | boolean | `false`       | Whether to enable the on demand mode.                   |
| `ICS_{counter}_URL`         | string  | `null`        | The URL of the ICS file to serve.                       |
| `ICS_{counter}_PATH`        | string? | `null`        | The path to serve the ICS file.                         |

## On Demand Mode

If `ICS_ON_DEMAND` is set to `true`, you can make a GET request to `/` with the query parameter `url`.

```http
/?url=https%3A%2F%2Fexample.com%2Fcalendar.ics
```

This will return the ICS file from `https://example.com/calendar.ics`.

**Don't forget to URL encode the query parameters.**

## Example

```yaml
version: "3"
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
```

This will result in to paths being published:
`GET` `/your-new-filename-which-will-be-served.ics` -> `https://example.com/calendar1.ics`
`GET` `/0.ics` -> `https://example.com/calendar2.ics`

If no path is specified, the tool will try to use `{counter}.ics`, starting with `0` and incrementing by `1` for each new ICS file. If another file blocks the counter, the tool will skip the counter and try the next one.
