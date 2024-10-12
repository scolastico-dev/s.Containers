import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

@Injectable()
export class ReCaptchaService {
  private readonly axiosInstance: AxiosInstance;
  private readonly logger = new Logger(ReCaptchaService.name);

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: 'https://www.google.com/recaptcha/',
    });
  }

  /**
   * Validates a Google reCAPTCHA v2 token.
   *
   * @param token - The reCAPTCHA token provided by the client.
   * @param secretKey - The secret key for server-side validation.
   * @returns A promise that resolves to a boolean indicating whether the validation was successful.
   */
  async validateReCaptcha(token: string, secretKey: string): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      params.append('secret', secretKey);
      params.append('response', token);

      const response: AxiosResponse<any> = await this.axiosInstance.post(
        'api/siteverify',
        params,
      );

      const { success } = response.data;
      return success;
    } catch (error) {
      this.logger.error('ReCaptcha validation error:', error);
      return false;
    }
  }
}
