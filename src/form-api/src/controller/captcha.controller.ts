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
    description: 'The captcha is not configured to be generated locally',
  })
  async getCaptcha(@Param('id') id: string): Promise<CaptchaData> {
    const secret = process.env[`CFG_${id}_CAPTCHA_SECRET`];
    if (!secret)
      throw new HttpException('Captcha not found', HttpStatus.NOT_FOUND);
    const generate =
      (process.env[`CFG_${id}_CAPTCHA_GENERATE`] || 'false').toLowerCase() ===
      'true';
    if (!generate)
      throw new HttpException(
        'The captcha is not configured to be generated locally',
        HttpStatus.NOT_ACCEPTABLE,
      );
    return await this.genService.generateCaptcha(secret, new CaptchaConfig(id));
  }
}
