import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import {
  ApiNotAcceptableResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CaptchaConfig } from 'src/captcha/config.type';
import { CaptchaData } from 'src/captcha/data.type';
import { GeneratorService } from 'src/captcha/generator.service';

@Controller('captcha')
@ApiTags('captcha')
export class CaptchaController {
  constructor(private readonly genService: GeneratorService) {}

  @Get('json/:id')
  @ApiOkResponse({
    description: 'Returns a new captcha challenge',
    type: CaptchaData,
  })
  @ApiNotFoundResponse({ description: 'Captcha not found' })
  @ApiNotAcceptableResponse({
    description:
      'Invalid captcha strength; most likely reCAPTCHA is used instead of a local captcha',
  })
  async getCaptcha(@Param('id') id: string): Promise<CaptchaData> {
    const secret = process.env[`CFG_${id}_CAPTCHA_SECRET`];
    if (!secret)
      throw new HttpException('Captcha not found', HttpStatus.NOT_FOUND);
    const strength = Number(process.env[`CFG_${id}_CAPTCHA_STRENGTH`]) || 0;
    if (strength < 1 || strength > 5)
      throw new HttpException(
        'Invalid captcha strength',
        HttpStatus.NOT_ACCEPTABLE,
      );
    return await this.genService.generateCaptcha(secret, new CaptchaConfig(id));
  }
}
