import { ApiProperty } from '@nestjs/swagger';

/**
 * CaptchaData class representing the CAPTCHA generation output.
 */
export class CaptchaData {
  /**
   * The SHA-256 hash of the CAPTCHA text, timestamp, and secret.
   * @type {string}
   */
  @ApiProperty({
    description: 'The SHA-256 hash of the CAPTCHA text, timestamp, and secret.',
  })
  hash: string;

  /**
   * The CAPTCHA image encoded in base64 format.
   * @type {string}
   */
  @ApiProperty({ description: 'The CAPTCHA image encoded in base64 format.' })
  image: string;

  /**
   * The timestamp when the CAPTCHA was generated.
   * @type {number}
   */
  @ApiProperty({ description: 'The timestamp when the CAPTCHA was generated.' })
  timestamp: number;

  /**
   * The timestamp when the CAPTCHA expires (timestamp + 5 minutes).
   * @type {number}
   */
  @ApiProperty({
    description:
      'The timestamp when the CAPTCHA expires (timestamp + 5 minutes).',
  })
  expires: number;
}
