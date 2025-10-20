# `s.containers/receiptio-server`

### [Back to index](../../README.md)

## Why?

This container provides an HTTP API for printing receipts using "text only" thermal printers.
It mainly utilizes the `GS v 0` printer command set, to print images, html or markdown from [ReceiptIO](https://github.com/receiptline/receiptio).

> See [https://[...].epson.biz/[...]/escpos/gs_lv_0.html](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/gs_lv_0.html) for more information about the `GS v 0` command set.

## Environment Variables

| Name                           | Type    | Default Value                      | Description                                                                       |
|--------------------------------|---------|------------------------------------|-----------------------------------------------------------------------------------|
| `RECEIPTIO_ARGUMENTS`          | string  | `-c 42`                            | Arguments for ReceiptIO, e.g. `-c 42` for 42 characters per line.                 |
| `TARGET_DEVICE`                | string  | `/dev/usb/lp0`                     | Target device for printing, only supporting file paths from linux.                |
| `PRINT_IMAGE_DENSITY`          | int     | `0`                                | Density for printed images.\*                                                     |
| `PRINT_HTML_FONT`              | string  | `Noto Sans`                        | Font for HTML printing, anything from Google Fonts.                               |
| `PRINT_HTML_WIDTH`             | string  | `80mm`                             | Width for HTML printing. Supports CSS width values, e.g. `80mm`.                  |
| `PRINT_IMAGE_MAX_WIDTH`        | int     | `504`                              | Maximum width for image printing in dots. See printer manual for details.         |
| `PRINT_TEXT_CHARS_PER_LINE`    | int     | `42`                               | Characters per line feed directly printing text without the `GS v 0` command set. |
| `PRINT_TEXT_ENCODING`          | string  | `cp437`                            | Encoding for text printing.\*\*                                                   |
| `PRINT_IMAGE_RASTER_CACHE_MAX` | int     | `20`                               | Maximum number of image rasters to keep in the cache.                             |
| `PRINT_HTML_PNG_CACHE_MAX`     | int     | `20`                               | Maximum number of HTML PNGs to keep in the cache.                                 |
| `STATIC_CACHE_ENABLED`         | boolean | `false`                            | Enable file, instead of in-memory caching.                                        |
| `STATIC_CACHE_DIR`             | string  | `./cache`                          | Directory for static cache files. Must be writable by the container user.         |
| `STATIC_CACHE_LIFETIME`        | int     | `604800`                           | Lifetime of static cache files in seconds (default: 7 days).                      |
| `PULL_INTERVAL`                | int     | `5000`                             | Interval in milliseconds to pull new print jobs from the queue.                   |
| `PULL_URL`                     | string  | `http://localhost:3000/print/pull` | URL to pull print jobs from. This should be the URL of the queue service.         |
| `CUPS_PRINTER_NAME`            | string  | `''`                               | CUPS printer name. If set, printing will use CUPS instead of direct device access.|
| `CUPS_SERVER`                  | string  | `localhost`                        | CUPS server hostname or IP address.                                               |
| `CUPS_PORT`                    | int     | `631`                              | CUPS server port.                                                                  |
| `CUPS_USERNAME`                | string  | `''`                               | CUPS username for authentication (optional).                                      |
| `CUPS_PASSWORD`                | string  | `''`                               | CUPS password for authentication (optional).                                      |

\* = 0=8-dot single, 1=8-dot double, 32=24-dot single, 33=24-dot double.

\*\* =  Anything supported by [iconv-lite](https://www.npmjs.com/package/iconv-lite) can be used, e.g. `cp437`, `utf-8`, `iso-8859-1`, etc.

## Example

### Direct Device Access

```yml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/receiptio-server:latest
    restart: unless-stopped
    ports:
      - 3000:3000
    environment:
      TARGET_DEVICE: &printer /dev/usb/lp1
      STATIC_CACHE_DIR: /cache
    devices:
      - *printer
    volumes:
      - cache:/cache
    privileged: true

volumes:
  cache:
```

### CUPS Printer

```yml
services:
  app:
    image: ghcr.io/scolastico-dev/s.containers/receiptio-server:latest
    restart: unless-stopped
    ports:
      - 3000:3000
    environment:
      CUPS_PRINTER_NAME: receipt_printer
      CUPS_SERVER: host.docker.internal
      CUPS_PORT: 631
      CUPS_USERNAME: admin
      CUPS_PASSWORD: password
      STATIC_CACHE_DIR: /cache
    volumes:
      - cache:/cache
    extra_hosts:
      - "host.docker.internal:host-gateway"

volumes:
  cache:
```
