import { Injectable, Logger } from '@nestjs/common';
import { createCanvas, registerFont } from 'canvas';
import { CaptchaConfig } from './config.type';
import { CaptchaData } from './data.type';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

/**
 * GeneratorService is responsible for generating and verifying CAPTCHAs.
 */
@Injectable()
export class GeneratorService {
  private readonly log = new Logger(GeneratorService.name);

  /**
   * Directory to store downloaded fonts.
   * @type {string}
   */
  private fontsDir = path.resolve(__dirname, 'fonts');

  constructor() {
    // Ensure the fonts directory exists
    if (!fs.existsSync(this.fontsDir)) {
      fs.mkdirSync(this.fontsDir, { recursive: true });
    }
  }

  /**
   * Generates a random RGB color string.
   * @returns {string} A random RGB color string in the format 'rgb(r,g,b)'.
   */
  private randomColor(): string {
    const r = Math.floor(Math.random() * 256); // 0-255
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r},${g},${b})`;
  }

  /**
   * Selects a random font from a provided list.
   * @param {string[]} fonts - An array of font names.
   * @returns {string} The name of a random font.
   */
  private randomFont(fonts?: string[]): string {
    if (!fonts || fonts.length === 0) {
      fonts = ['Arial', 'Comic Sans MS'];
    }
    return fonts[Math.floor(Math.random() * fonts.length)];
  }

  /**
   * Parses a color string in hex or RGB format into its RGB components.
   * @param {string} color - The color string to parse.
   * @returns {{ r: number; g: number; b: number }} An object containing the RGB components.
   * @throws {Error} If the color format is unsupported.
   */
  private parseColor(color: string): { r: number; g: number; b: number } {
    if (color.startsWith('#')) {
      // Hex format
      const bigint = parseInt(color.slice(1), 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return { r, g, b };
    } else if (color.startsWith('rgb(')) {
      // RGB format
      const rgb = color
        .slice(4, -1)
        .split(',')
        .map((c) => parseInt(c.trim(), 10));
      return { r: rgb[0], g: rgb[1], b: rgb[2] };
    } else {
      // Unknown format
      throw new Error(`Unsupported color format: ${color}`);
    }
  }

  /**
   * Generates a color similar to the given color by adjusting its RGB values slightly.
   * @param {string} color - The base color.
   * @returns {string} A color string similar to the base color.
   */
  private colorNear(color: string): string {
    // Parse the RGB color
    const rgb = this.parseColor(color);

    // Adjust the color slightly
    const variation = 30; // Adjust by up to ±30
    const r = Math.min(
      255,
      Math.max(0, rgb.r + (Math.random() * variation * 2 - variation)),
    );
    const g = Math.min(
      255,
      Math.max(0, rgb.g + (Math.random() * variation * 2 - variation)),
    );
    const b = Math.min(
      255,
      Math.max(0, rgb.b + (Math.random() * variation * 2 - variation)),
    );

    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }

  /**
   * Downloads a font from the given URL and saves it in the fonts directory.
   * @param {string} fontUrl - The URL of the font to download.
   * @param {string} [fontFamily] - The font family name to use.
   * @returns {Promise<{ fontPath: string; fontFamily: string }>} The local path and font family name.
   */
  private async downloadFont(
    fontUrl: string,
    fontFamily?: string,
  ): Promise<{ fontPath: string; fontFamily: string }> {
    const fontHash = crypto.createHash('md5').update(fontUrl).digest('hex');
    const fontFilename = `${fontHash}.ttf`;
    const fontPath = path.join(this.fontsDir, fontFilename);

    // If fontFamily is not provided, derive it from the URL's filename
    if (!fontFamily) {
      const urlFilename = path.basename(fontUrl);
      fontFamily = path.basename(urlFilename, path.extname(urlFilename));
    }

    if (!fs.existsSync(fontPath)) {
      this.log.debug(`Downloading font from ${fontUrl}`);
      try {
        const response = await axios.get(fontUrl, {
          responseType: 'arraybuffer',
        });
        fs.writeFileSync(fontPath, response.data);
        this.log.debug(`Font saved to ${fontPath}`);
      } catch (error) {
        this.log.error(`Error downloading font: ${error.message}`);
        throw error;
      }
    } else {
      this.log.debug(`Font already exists at ${fontPath}`);
    }

    return { fontPath, fontFamily };
  }

  /**
   * Registers custom fonts with the canvas.
   * @param {CaptchaConfig} config - Configuration for CAPTCHA generation.
   * @returns {Promise<void>}
   */
  private async registerCustomFonts(config: CaptchaConfig): Promise<void> {
    if (config.fontUrls && config.fontUrls.length > 0) {
      for (const fontEntry of config.fontUrls) {
        try {
          const { fontPath, fontFamily } = await this.downloadFont(
            fontEntry.url,
            fontEntry.family,
          );
          registerFont(fontPath, { family: fontFamily });
          config.fonts.push(fontFamily);
        } catch (error) {
          this.log.error(
            `Failed to register font from ${fontEntry.url}: ${error.message}`,
          );
        }
      }
    }
  }

  /**
   * Generates a CAPTCHA image and corresponding hash.
   * @param {string} secret - A secret key used for hashing.
   * @param {CaptchaConfig} config - Configuration for CAPTCHA generation.
   * @returns {Promise<CaptchaData>} An object containing the hash, image, timestamp, and expires.
   */
  async generateCaptcha(
    secret: string,
    config: CaptchaConfig = new CaptchaConfig(),
  ): Promise<CaptchaData> {
    // Register custom fonts if any
    await this.registerCustomFonts(config);

    // Generate random text for the CAPTCHA
    const chars = config.charset;
    let captchaText = '';
    for (let i = 0; i < config.characterCount; i++) {
      captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const width = 200;
    const height = 70;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const distinguishableColors = [
      '#000000', // Black
      '#FF0000', // Red
      '#0000FF', // Blue
      '#008000', // Green
      '#FFFF00', // Yellow
      '#FFA500', // Orange
      '#800080', // Purple
    ];

    let backgroundColor: string;
    let textColors: string[];

    // Determine background color based on config
    if (config.backgroundColorType === 'distinguishable') {
      backgroundColor =
        distinguishableColors[
          Math.floor(Math.random() * distinguishableColors.length)
        ];
    } else if (config.backgroundColorType === 'random') {
      backgroundColor = this.randomColor();
    } else {
      // Default to distinguishable
      backgroundColor =
        distinguishableColors[
          Math.floor(Math.random() * distinguishableColors.length)
        ];
    }

    // Determine text colors based on config
    if (config.textColorType === 'distinguishable') {
      textColors = distinguishableColors.filter(
        (color) => color !== backgroundColor,
      );
    } else if (config.textColorType === 'randomDifferentFromBackground') {
      textColors = []; // Will use random colors different from background
    } else if (config.textColorType === 'random') {
      textColors = []; // Will use completely random colors
    } else {
      // Default
      textColors = distinguishableColors.filter(
        (color) => color !== backgroundColor,
      );
    }

    // Fill the background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Fixed margins to ensure letters are within bounds
    const marginLeft = 10;
    const marginTop = 40;

    // Character spacing
    const charSpacing = (width - 2 * marginLeft) / captchaText.length;

    // Draw each character
    for (let i = 0; i < captchaText.length; i++) {
      const fontSize =
        Math.floor(
          Math.random() * (config.fontSizeMax - config.fontSizeMin + 1),
        ) + config.fontSizeMin;
      let font;
      if (config.useRandomFonts) {
        font = `${fontSize}px ${this.randomFont(config.fonts)}`;
      } else {
        font = `${fontSize}px ${config.fonts[0]}`;
      }
      ctx.font = font;

      // Select text color
      let textColor: string;
      if (config.textColorType === 'distinguishable') {
        textColor = textColors[Math.floor(Math.random() * textColors.length)];
      } else if (config.textColorType === 'randomDifferentFromBackground') {
        do {
          textColor = this.randomColor();
        } while (textColor === backgroundColor);
      } else if (config.textColorType === 'random') {
        textColor = this.randomColor();
      } else {
        // Default
        textColor = this.randomColor();
      }

      ctx.fillStyle = textColor;
      ctx.save();

      // Position and rotation
      const x = marginLeft + i * charSpacing + charSpacing / 2;
      const y = marginTop;
      const rotation =
        Math.random() * config.rotationRange * 2 - config.rotationRange;

      ctx.translate(x, y);
      ctx.rotate(rotation);

      // Ensure the character is fully within bounds
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      ctx.fillText(captchaText.charAt(i), 0, 0);
      ctx.restore();
    }

    // Base artifacts
    const baseNumLines = 5;
    const baseNumDots = 50;

    let numLines = Math.ceil(baseNumLines * config.artifactsMultiplier);
    let numDots = Math.ceil(baseNumDots * config.artifactsMultiplier);

    if (config.minimalArtifacts) {
      numLines = Math.ceil(2 * config.artifactsMultiplier);
      numDots = Math.ceil(10 * config.artifactsMultiplier);
    }

    // Add random lines
    for (let i = 0; i < numLines; i++) {
      let lineColor: string;
      if (config.textColorType === 'distinguishable') {
        lineColor = textColors[Math.floor(Math.random() * textColors.length)];
      } else {
        lineColor = this.randomColor();
      }

      ctx.strokeStyle = lineColor;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }

    // Add random dots
    for (let i = 0; i < numDots; i++) {
      let dotColor: string;
      if (config.textColorType === 'distinguishable') {
        dotColor = textColors[Math.floor(Math.random() * textColors.length)];
      } else {
        dotColor = this.randomColor();
      }

      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Apply distortion if enabled
    if (config.applyDistortion) {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      const maxShift = 5 * config.distortionLevel; // Adjust distortion strength

      for (let y = 0; y < height; y++) {
        const shift = Math.floor(Math.random() * maxShift);
        for (let x = 0; x < width - shift; x++) {
          const index = (y * width + x) * 4;
          const shiftedIndex = (y * width + x + shift) * 4;
          data[index] = data[shiftedIndex];
          data[index + 1] = data[shiftedIndex + 1];
          data[index + 2] = data[shiftedIndex + 2];
          data[index + 3] = data[shiftedIndex + 3];
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // At least one character color is near the background color
    if (config.oneCharacterNearBackground) {
      const index = Math.floor(Math.random() * captchaText.length);
      const fontSize =
        Math.floor(
          Math.random() * (config.fontSizeMax - config.fontSizeMin + 1),
        ) + config.fontSizeMin;
      let font;
      if (config.useRandomFonts) {
        font = `${fontSize}px ${this.randomFont(config.fonts)}`;
      } else {
        font = `${fontSize}px ${config.fonts[0]}`;
      }
      ctx.font = font;

      const nearColor = this.colorNear(backgroundColor);
      ctx.fillStyle = nearColor;
      ctx.save();

      // Position and rotation
      const x = marginLeft + index * charSpacing + charSpacing / 2;
      const y = marginTop;
      const rotation =
        Math.random() * config.rotationRange * 2 - config.rotationRange;

      ctx.translate(x, y);
      ctx.rotate(rotation);

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      ctx.fillText(captchaText.charAt(index), 0, 0);
      ctx.restore();
    }

    // Generate timestamp
    const timestamp = Date.now();

    // Calculate the expiration timestamp (timestamp + 5 minutes)
    const expires = timestamp + 300000; // 5 minutes in milliseconds

    // Hash the CAPTCHA text, timestamp, and secret
    const toHash = captchaText + timestamp + secret;
    const hash = crypto.createHash('sha256').update(toHash).digest('hex');

    // Convert the canvas to a base64 image
    const imageBase64 = canvas.toDataURL();

    this.log.debug(`Generated CAPTCHA: ${captchaText} (${hash})`);

    // Return the CaptchaData object
    return {
      hash: hash,
      image: imageBase64,
      timestamp: timestamp,
      expires: expires,
    };
  }

  /**
   * Verifies if the provided input matches the CAPTCHA.
   * @param {string} providedHash - The hash received when generating the CAPTCHA.
   * @param {string} inputText - The text input provided by the user.
   * @param {string} secret - The secret key used during generation.
   * @param {number} timestamp - The timestamp received when generating the CAPTCHA.
   * @returns {boolean} True if the CAPTCHA is valid, false otherwise.
   */
  verifyCaptcha(
    providedHash: string,
    inputText: string,
    secret: string,
    timestamp: number,
  ): boolean {
    const currentTime = Date.now();
    if (Math.abs(currentTime - timestamp) > 300000) {
      // The timestamp is not within ±5 minutes
      return false;
    }

    const toHash = inputText + timestamp + secret;
    const hash = crypto.createHash('sha256').update(toHash).digest('hex');

    return hash === providedHash;
  }
}
