import { Injectable } from '@nestjs/common';
import { CfgService } from './cfg.service';
import { CacheService, RasterCacheValue } from './cache.service';
import { createWriteStream, existsSync } from 'fs';
import * as iconv from 'iconv-lite';
import * as receiptio from 'receiptio';
import { PNG } from 'pngjs';
import puppeteer from 'puppeteer';
import { createHash } from 'crypto';
import * as QRCode from 'qrcode';
import { IdLogger } from 'src/id.logger';

export type Align = 'left' | 'center' | 'right';

@Injectable()
export class PrintService {
  constructor(
    private readonly cfg: CfgService,
    private readonly cache: CacheService,
    private readonly logger: IdLogger,
  ) {
    logger.setContext(PrintService.name);
  }

  private readonly ESC = 0x1b;
  private readonly GS = 0x1d;
  private readonly INIT = Buffer.from([this.ESC, 0x40]); // ESC @
  private readonly LINE_FEED = Buffer.from('\n');

  printRaw(data: Buffer): Promise<string> {
    if (!existsSync(this.cfg.targetDevice)) {
      return Promise.reject(
        new Error(`Target device ${this.cfg.targetDevice} does not exist`),
      );
    }
    this.logger.log(`Sending raw bytes to ${this.cfg.targetDevice}`);
    const stream = createWriteStream(this.cfg.targetDevice);
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        this.logger.log('Target device accepted data');
        resolve('Print job completed');
      });
      stream.on('error', (err) => reject(`Print job failed: ${err.message}`));
      stream.write(data);
      stream.end();
    });
  }

  async cutReceipt(): Promise<string> {
    this.logger.log('Cutting receipt');
    const cut = Buffer.from([this.GS, 0x56, 0x00]); // GS V 0
    return await this.printRaw(
      Buffer.concat([this.INIT, ...Array(5).fill(this.LINE_FEED), cut]),
    );
  }

  private makeImageRaster(
    imageData: Buffer,
    width: number,
    height: number,
  ): { raster: Buffer; widthBytes: number; height: number } {
    this.logger.log(`Creating image raster for ${width}x${height}`);
    const widthBytes = Math.ceil(width / 8);
    const raster = Buffer.alloc(widthBytes * height, 0x00);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIndex = y * width + x;
        const pixelValue = imageData[pixelIndex] || 0;
        const pixelOn = pixelValue < 128;
        if (pixelOn) {
          const byteIndex = y * widthBytes + (x >> 3);
          const bit = 7 - (x & 0x07);
          raster[byteIndex] |= 1 << bit;
        }
      }
    }
    return { raster, widthBytes, height };
  }

  private sha1(...parts: (string | Buffer | number)[]): string {
    const h = createHash('sha1');
    for (const p of parts) h.update(typeof p === 'number' ? String(p) : p);
    return h.digest('hex');
  }

  async printPng(
    data: Buffer,
    width: number = 1,
    align: Align = 'center',
  ): Promise<string> {
    this.logger.log(
      `Printing PNG image with width factor ${width} and align ${align}`,
    );
    const png: PNG = PNG.sync.read(data);
    const maxWidth = this.cfg.printImageMaxWidth;
    let targetWidth = Math.round(maxWidth * Math.max(0, Math.min(width, 1)));
    targetWidth = Math.max(1, targetWidth);
    const scale = targetWidth / png.width;
    const targetHeight = Math.max(1, Math.round(png.height * scale));

    // cache key for the final raster we will send to the printer
    const rasterKey = this.sha1(
      data,
      '|',
      targetWidth,
      '|',
      targetHeight,
      '|',
      this.cfg.printImageDensity,
      '|',
      align,
    );

    const cached = this.cache.getImageRaster(rasterKey);
    if (cached) {
      return this.printRaster(cached);
    }

    // scale to target size and convert to grayscale
    const imageData = Buffer.alloc(targetWidth * targetHeight);
    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const srcX = Math.min(png.width - 1, Math.round(x / scale));
        const srcY = Math.min(png.height - 1, Math.round(y / scale));
        const idx = (png.width * srcY + srcX) << 2;
        const r = png.data[idx];
        const g = png.data[idx + 1];
        const b = png.data[idx + 2];
        const a = png.data[idx + 3];
        let gray = 255;
        if (a >= 128) {
          gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }
        imageData[y * targetWidth + x] = gray;
      }
    }

    // Alignment: if width < 1, pad left/center/right with white pixels
    let finalImageData: Buffer;
    let finalWidth = maxWidth;
    if (targetWidth < maxWidth) {
      finalImageData = Buffer.alloc(maxWidth * targetHeight, 255); // white background
      let offset = 0;
      if (align === 'center') {
        offset = Math.floor((maxWidth - targetWidth) / 2);
      } else if (align === 'right') {
        offset = maxWidth - targetWidth;
      }
      for (let y = 0; y < targetHeight; y++) {
        imageData.copy(
          finalImageData,
          y * maxWidth + offset,
          y * targetWidth,
          y * targetWidth + targetWidth,
        );
      }
    } else {
      finalImageData = imageData;
      finalWidth = targetWidth;
    }

    const {
      raster,
      widthBytes,
      height: rasterHeight,
    } = this.makeImageRaster(finalImageData, finalWidth, targetHeight);

    const value: RasterCacheValue = {
      raster,
      widthBytes,
      height: rasterHeight,
    };
    this.cache.setImageRaster(rasterKey, value);

    return this.printRaster(value);
  }

  private async printRaster({
    raster,
    widthBytes,
    height: rasterHeight,
  }: RasterCacheValue): Promise<string> {
    const xL = widthBytes & 0xff;
    const xH = (widthBytes >> 8) & 0xff;
    const yL = rasterHeight & 0xff;
    const yH = (rasterHeight >> 8) & 0xff;
    return await this.printRaw(
      Buffer.concat([
        this.INIT,
        Buffer.from([
          this.GS,
          0x76,
          0x30,
          this.cfg.printImageDensity,
          xL,
          xH,
          yL,
          yH,
        ]),
        raster,
        this.LINE_FEED,
      ]),
    );
  }

  async printHtml(html: string): Promise<string> {
    this.logger.log('Printing HTML content');
    // cache the PNG buffer produced by puppeteer
    const htmlKey = this.sha1(
      html,
      '|',
      this.cfg.printHtmlFont,
      '|',
      this.cfg.printHtmlWidth,
    );

    let buffer = this.cache.getHtmlPng(htmlKey);
    if (!buffer) {
      const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(
        [
          '<!DOCTYPE html>',
          '<html lang="en">',
          '<head>',
          '<meta charset="UTF-8">',
          '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
          `<title>Receipt</title>`,
          '</head>',
          `<body>${html}</body>`,
          '</html>',
        ].join(''),
      );
      await page.addStyleTag({
        url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
          this.cfg.printHtmlFont,
        )}:wght@400;700&display=swap`,
      });
      await page.addStyleTag({
        content: [
          `body { font-family: '${this.cfg.printHtmlFont}', sans-serif; }`,
          'body, p, h1, h2, h3, h4, h5, h6 { margin: 0; padding: 0; }',
          `body { width: ${this.cfg.printHtmlWidth}; word-break: break-word; overflow-wrap: anywhere; }`,
          'h1 { font-size: 1.5em; }',
          'h2 { font-size: 1.25em; }',
          'h3 { font-size: 1.1em; }',
          'h4, h5, h6 { font-size: 1em; }',
          'p { font-size: 0.9em; word-break: break-word; overflow-wrap: anywhere; }',
          'svg { max-width: 100%; height: auto; }',
        ].join('\n'),
      });
      const el = await page.$('body');
      buffer = Buffer.from(
        await el.screenshot({
          type: 'png',
          encoding: 'binary',
          omitBackground: true,
          captureBeyondViewport: true,
        }),
      );
      await browser.close();

      this.cache.setHtmlPng(htmlKey, Buffer.from(buffer));
    }

    return await this.printPng(Buffer.from(buffer));
  }

  async printReceipt(md: string): Promise<string> {
    this.logger.log('Printing receipt from Markdown (ReceiptIO)');
    return await this.printHtml(
      await receiptio.print(md, `${this.cfg.receiptIoArguments} -p svg`),
    );
  }

  async printText(text: string, align: Align = 'left'): Promise<string> {
    this.logger.log(`Printing text with alignment: ${align}`);
    const charsPerLine = this.cfg.printTextCharsPerLine;
    const lines: string[] = [];
    let currentLine = '';
    for (const word of text.split(' ')) {
      if (currentLine.length + word.length + 1 > charsPerLine) {
        lines.push(currentLine.trim());
        currentLine = '';
      }
      currentLine += word + ' ';
    }
    if (currentLine) lines.push(currentLine.trim());

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const padding = charsPerLine - line.length;
      if (padding > 0) {
        switch (align) {
          case 'left':
            lines[i] = line + ' '.repeat(padding);
            break;
          case 'center':
            const leftPadding = Math.floor(padding / 2);
            const rightPadding = padding - leftPadding;
            lines[i] =
              ' '.repeat(leftPadding) + line + ' '.repeat(rightPadding);
            break;
          case 'right':
            lines[i] = ' '.repeat(padding) + line;
            break;
        }
      }
    }

    const encoded = iconv.encode(
      lines.join('\n') + '\n',
      this.cfg.printTextEncoding,
    );
    return await this.printRaw(encoded);
  }

  async printQrCode(
    data: string,
    width = 1,
    align: Align = 'center',
  ): Promise<string> {
    this.logger.log('Printing QR code');
    const qrCode = await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 1,
    });
    return await this.printPng(qrCode, width, align);
  }
}
