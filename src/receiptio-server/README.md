# `s.containers/receiptio-server`

### [Back to index](../../README.md)

## Why?

This container provides an HTTP API for printing receipts using "text only" thermal printers.
It mainly utilizes the `GS v 0` printer command set, to print images, html or markdown from [ReceiptIO](https://github.com/receiptline/receiptio).

> See [https://[...].epson.biz/[...]/escpos/gs_lv_0.html](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lv_0.html) for more information about the `GS v 0` command set.

## Environment Variables

| Name                                  | Type   | Default Value         | Description                                                                       |
|---------------------------------------|--------|-----------------------|-----------------------------------------------------------------------------------|
| `RECEIPTIO_ARGUMENTS`                 | string | `-c 42`               | Arguments for ReceiptIO, e.g. `-c 42` for 42 characters per line.                 |
| `TARGET_DEVICE`                       | string | `/dev/usb/lp0`        | Target device for printing, only supporting file paths from linux.                |
| `PRINT_IMAGE_DENSITY`                 | int    | `0`                   | Density for printed images.\*                                                     |
| `PRINT_HTML_FONT`                     | string | `Noto Sans`           | Font for HTML printing, anything from Google Fonts.                               |
| `PRINT_HTML_WIDTH`                    | string | `80mm`                | Width for HTML printing. Supports CSS width values, e.g. `80mm`.                  |
| `PRINT_IMAGE_MAX_WIDTH`               | int    | `504`                 | Maximum width for image printing in dots. See printer manual for details.         |
| `PRINT_TEXT_CHARS_PER_LINE`           | int    | `42`                  | Characters per line feed directly printing text without the `GS v 0` command set. |
| `PRINT_TEXT_ENCODING`                 | string | `cp437`               | Encoding for text printing.\*\*                                                   |

\* = 0=8-dot single, 1=8-dot double, 32=24-dot single, 33=24-dot double.

\*\* =  Anything supported by [iconv-lite](https://www.npmjs.com/package/iconv-lite) can be used, e.g. `cp437`, `utf-8`, `iso-8859-1`, etc.

## Example

```yml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/receiptio-server:latest
    restart: unless-stopped
    ports:
      - 3000:3000
    environment:
      TARGET_DEVICE: /dev/usb/lp2
    devices:
      - /dev/usb/lp2:/dev/usb/lp2
    privileged: true
```
