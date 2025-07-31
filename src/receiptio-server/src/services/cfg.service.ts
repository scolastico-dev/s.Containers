import { Injectable } from '@nestjs/common';
import { $bool, $int, $str } from '@scolastico-dev/env-helper';
import * as dotenv from 'dotenv';

@Injectable()
export class CfgService {
  /** @hidden */
  constructor() {
    dotenv.config();
  }

  /**
   * The receiptio arguments to be used when printing receipts.
   * @example RECEIPTIO_ARGUMENTS='-c 42'
   * @see {@link https://github.com/receiptline/receiptio#usage}
   */
  readonly receiptIoArguments = $str('RECEIPTIO_ARGUMENTS', '-c 42');

  /**
   * Target device for printing.
   * @example TARGET_DEVICE='/dev/usb/lp0'
   */
  readonly targetDevice = $str('TARGET_DEVICE', '/dev/usb/lp0');

  /**
   * The density of the printed image.
   * 0=8-dot single,
   * 1=8-dot double,
   * 32=24-dot single,
   * 33=24-dot double.
   * @example PRINT_IMAGE_DENSITY=0
   */
  readonly printImageDensity = $int('PRINT_IMAGE_DENSITY', 0);

  /**
   * The font to be used for html printing.
   * @example PRINT_HTML_FONT=Noto Sans
   * @see {@link https://fonts.google.com/specimen/Noto+Sans}
   */
  readonly printHtmlFont = $str('PRINT_HTML_FONT', 'Noto Sans');

  /**
   * The width to be used for html printing.
   * @example PRINT_HTML_WIDTH=80mm
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/width}
   */
  readonly printHtmlWidth = $str('PRINT_HTML_WIDTH', '80mm');

  /**
   * The width to be used as the maximum width for image printing in dots.
   * @example PRINT_IMAGE_MAX_WIDTH=504
   */
  readonly printImageMaxWidth = $int('PRINT_IMAGE_MAX_WIDTH', 504);

  /**
   * The characters printed per line feed for default text printing.
   * @example PRINT_TEXT_CHARS_PER_LINE=42
   */
  readonly printTextCharsPerLine = $int('PRINT_TEXT_CHARS_PER_LINE', 42);

  /**
   * The encoding to be used for printing text.
   * @example PRINT_TEXT_ENCODING=cp437
   * @see {@link https://www.npmjs.com/package/iconv-lite}
   */
  readonly printTextEncoding = $str('PRINT_TEXT_ENCODING', 'cp437');

  /**
   * The maximum number of image rasters to keep in the cache.
   * @example PRINT_IMAGE_RASTER_CACHE_MAX=20
   */
  readonly printImageRasterCacheMax = $int('PRINT_IMAGE_RASTER_CACHE_MAX', 20);

  /**
   * The maximum number of HTML PNGs to keep in the cache.
   * @example PRINT_HTML_PNG_CACHE_MAX=20
   */
  readonly printHtmlPngCacheMax = $int('PRINT_HTML_PNG_CACHE_MAX', 20);

  /**
   * Enable the static cache for storing cache items in the filesystem.
   * @example STATIC_CACHE_ENABLED=false
   */
  readonly staticCacheEnabled = $bool('STATIC_CACHE_ENABLED', false);

  /**
   * The static cache directory for storing cache files of converted images.
   * @example STATIC_CACHE_DIR='./cache'
   */
  readonly staticCacheDir = $str('STATIC_CACHE_DIR', './cache');

  /**
   * The static cache lifetime in seconds since the last access.
   * @example STATIC_CACHE_LIFETIME=604800
   */
  readonly staticCacheLifetime = $int('STATIC_CACHE_LIFETIME', 604800);
}
