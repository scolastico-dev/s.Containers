import { Module } from '@nestjs/common';
import { CaptchaController } from './controller/captcha.controller';
import { SubmitController } from './controller/submit.controller';
import { DebugController } from './controller/debug.controller';
import { MailService } from './etc/mail.service';
import { ReCaptchaService } from './captcha/recaptcha.service';
import { GeneratorService } from './captcha/generator.service';

@Module({
  controllers: [
    CaptchaController,
    SubmitController,
    ...((process.env.ENABLE_DEBUG_ENDPOINT || 'false').toLowerCase() === 'true'
      ? [DebugController]
      : []),
  ],
  providers: [MailService, ReCaptchaService, GeneratorService],
})
export class AppModule {}
