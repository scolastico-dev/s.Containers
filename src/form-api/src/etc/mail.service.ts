import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || null,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_TLS !== 'false',
    auth: {
      user: process.env.SMTP_USER || null,
      pass: process.env.SMTP_PASSWORD || null,
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_TLS !== 'false',
    },
  });

  constructor() {
    // Check if the SMTP configuration is valid and we can log in.
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Failed to verify SMTP configuration', error.stack);
      } else {
        this.logger.log('SMTP configuration verified');
      }
    });
  }

  /**
   * Sends an email with HTML content.
   * @param {string | string[]} to - Recipient email address(es).
   * @param {string} subject - Subject of the email.
   * @param {string} html - HTML content of the email.
   * @throws {HttpException} If sending the email fails.
   */
  async sendEmail(to: string | string[], subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error.stack);
      throw new HttpException(
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sends an email with plain text content.
   * @param {string | string[]} to - Recipient email address(es).
   * @param {string} subject - Subject of the email.
   * @param {string} text - Plain text content of the email.
   * @throws {HttpException} If sending the email fails.
   */
  async sendPlainTextEmail(
    to: string | string[],
    subject: string,
    text: string,
  ) {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
      });
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error.stack);
      throw new HttpException(
        'Failed to send email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
