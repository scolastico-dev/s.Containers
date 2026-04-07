import {
  Controller,
  Post,
  HttpException,
  HttpStatus,
  Param,
  Body,
  Logger,
  Ip,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNotAcceptableResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import axios from 'axios';
import { GeneratorService } from 'src/captcha/generator.service';
import { ReCaptchaService } from 'src/captcha/recaptcha.service';
import { MailService } from 'src/etc/mail.service';
import ajv from 'ajv';

export class CaptchaResponse {
  @ApiProperty({
    description: 'The hash of the captcha response, not required for reCAPTCHA or altcha',
    required: false,
  })
  hash?: string;
  @ApiProperty({
    description:
      'The timestamp from the captcha request, not required for reCAPTCHA or altcha',
    required: false,
  })
  timestamp?: number;
  @ApiProperty({ description: 'The response to the captcha challenge' })
  response: string;
}

export class SubmitRequest {
  @ApiProperty({
    description: 'The captcha response, if required.',
    required: false,
  })
  captcha?: CaptchaResponse;
  @ApiProperty({ description: 'The form data to submit' })
  data: any;
}

@Controller('submit')
@ApiTags('submit')
export class SubmitController {
  constructor(
    private readonly genService: GeneratorService,
    private readonly captchaService: ReCaptchaService,
    private readonly mailService: MailService,
  ) {}

  private readonly log = new Logger(SubmitController.name);
  private trashedCaptcha: string[] = [];
  private schemaCache: { [key: string]: any } = {};
  private ajv = new ajv();

  @Post('json/:id')
  @ApiOkResponse({
    description: 'Returns a success message if the form was submitted',
  })
  @ApiBadRequestResponse({
    description:
      'The JSON schema of the form data does not match the expected schema',
  })
  @ApiUnauthorizedResponse({
    description: 'Malformed or missing captcha response',
  })
  @ApiForbiddenResponse({
    description: 'Invalid captcha response',
  })
  @ApiNotAcceptableResponse({
    description:
      'Invalid captcha strength; most likely reCAPTCHA is used instead of a local captcha',
  })
  @ApiGoneResponse({
    description:
      'Captcha response has expired, or already been used. Please try again.',
  })
  @ApiPayloadTooLargeResponse({
    description: 'Request body too large',
  })
  @ApiNotFoundResponse({ description: 'Form not configured' })
  async getCaptcha(
    @Param('id') id: string,
    @Body() body: SubmitRequest,
    @Ip() ip: string,
  ): Promise<{ success: boolean }> {
    const email = process.env[`CFG_${id}_EMAIL`];
    if (!email)
      throw new HttpException('Form not configured', HttpStatus.NOT_FOUND);

    // Max body size check
    const maxBodySize = Number(process.env[`CFG_${id}_MAX_SIZE`]) || 0;
    if (JSON.stringify(body).length > maxBodySize)
      throw new HttpException(
        'Request body too large',
        HttpStatus.PAYLOAD_TOO_LARGE,
      );

    // Altcha validation, if required
    const altchaUrl = process.env[`CFG_${id}_ALTCHA_VERIFY_URL`];
    if (altchaUrl) {
      if (!body.captcha || !body.captcha.response) {
        throw new HttpException(
          'Malformed or missing captcha response',
          HttpStatus.UNAUTHORIZED,
        );
      }
      const altchaDomain = process.env[`CFG_${id}_ALTCHA_DOMAIN`];
      try {
        let altchaPayload;
        let verifyRequestBody: any = {};
        if (body.captcha.response.trim().startsWith('{')) {
          altchaPayload = JSON.parse(body.captcha.response);
          verifyRequestBody = {
            ...altchaPayload,
            domain: altchaDomain,
            ip: ip,
          };
        } else {
          altchaPayload = JSON.parse(atob(body.captcha.response));
          verifyRequestBody = {
            payload: body.captcha.response,
            domain: altchaDomain,
            ip: ip,
            data: body.data,
          };
        }

        const verifyRes = await axios.post(altchaUrl, verifyRequestBody);

        if (
          !verifyRes.data ||
          (verifyRes.data.valid !== true && verifyRes.data.verified !== true)
        ) {
          throw new HttpException(
            'Invalid altcha response',
            HttpStatus.FORBIDDEN,
          );
        }

        if (verifyRes.data && verifyRes.data.fields) {
          body.data = { ...body.data, ...verifyRes.data.fields };
        } else if (altchaPayload.verificationData) {
          try {
            let decoded: any;
            if (typeof altchaPayload.verificationData === 'string') {
              const vDataStr = altchaPayload.verificationData.trim();
              decoded = vDataStr.startsWith('{')
                ? JSON.parse(vDataStr)
                : JSON.parse(atob(vDataStr));
            } else if (typeof altchaPayload.verificationData === 'object') {
              decoded = altchaPayload.verificationData;
            }

            if (decoded && decoded.fields) {
              body.data = { ...body.data, ...decoded.fields };
            }
          } catch (e: any) {
            this.log.error(
              `Failed to parse altcha verificationData: ${e.message}`,
            );
          }
        }
      } catch (err: any) {
        if (err instanceof HttpException) throw err;
        this.log.error(`Altcha verification failed for ${id}: ${err.message}`);
        throw new HttpException(
          'Invalid altcha response',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    // Json Schema check
    let schema = process.env[`CFG_${id}_JSON_SCHEMA`];
    const schemaUrl = process.env[`CFG_${id}_JSON_SCHEMA_URL`];
    if (schemaUrl) {
      if (!this.schemaCache[schemaUrl]) {
        this.schemaCache[schemaUrl] = await axios
          .get(schemaUrl)
          .then((r) => r.data);
      }
      schema = this.schemaCache[schemaUrl];
    }

    if (schema) {
      if (!this.ajv.validate(schema, body.data))
        throw new HttpException(
          'The JSON schema of the form data does not match the expected schema',
          HttpStatus.BAD_REQUEST,
        );
    }

    // Captcha validation, if required
    const secret = process.env[`CFG_${id}_CAPTCHA_SECRET`];
    if (secret) {
      if (!body.captcha || !body.captcha.response)
        throw new HttpException(
          'Malformed or missing captcha response',
          HttpStatus.UNAUTHORIZED,
        );
      const cid = `${id}#${body.captcha.response}`;
      if (this.trashedCaptcha.includes(cid))
        throw new HttpException(
          'Captcha response has expired, or already been used. Please try again.',
          HttpStatus.GONE,
        );
      const generate =
        (process.env[`CFG_${id}_CAPTCHA_GENERATE`] || 'false').toLowerCase() ===
        'true';
      if (generate) {
        const c = body.captcha as CaptchaResponse;
        if (
          !this.genService.verifyCaptcha(
            c.hash,
            c.response,
            secret,
            c.timestamp,
          )
        )
          throw new HttpException(
            'Invalid captcha response',
            HttpStatus.FORBIDDEN,
          );
      } else {
        if (!body.captcha)
          throw new HttpException(
            'Malformed or missing captcha response',
            HttpStatus.UNAUTHORIZED,
          );
        if (
          !(await this.captchaService.validateReCaptcha(
            body.captcha.response,
            secret,
          ))
        )
          throw new HttpException(
            'Invalid captcha response',
            HttpStatus.FORBIDDEN,
          );
      }
      this.trashedCaptcha.push(cid);
      setTimeout(() => {
        const idx = this.trashedCaptcha.indexOf(cid);
        if (idx >= 0) this.trashedCaptcha.splice(idx, 1);
      }, 5 * 60 * 1000);
    }

    this.log.log(`Received form data for ${id}`);

    // Process form data
    const subject = process.env[`CFG_${id}_SUBJECT`] || `Form-API: ${id}`;
    let allText = true;
    for (const key in body.data) {
      if (typeof body.data[key] !== 'string') {
        allText = false;
        break;
      }
    }
    const text = [
      `Form data from ${id}:`,
      ...(allText
        ? Object.entries(body.data).map(([k, v]) => `${k}: ${v}`)
        : [JSON.stringify(body.data, null, 2)]),
    ].join('\n');
    await this.mailService.sendPlainTextEmail(email, subject, text);

    return { success: true };
  }
}
