import {
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CaptchaConfig } from 'src/captcha/config.type';
import { CaptchaData } from 'src/captcha/data.type';
import { GeneratorService } from 'src/captcha/generator.service';
import { ReCaptchaService } from 'src/captcha/recaptcha.service';
import { MailService } from 'src/etc/mail.service';

@Controller('debug')
@ApiTags('debug')
export class DebugController {
  constructor(
    private readonly genService: GeneratorService,
    private readonly captchaService: ReCaptchaService,
    private readonly mailService: MailService,
  ) {}

  @Post('captcha')
  async getCaptcha(@Body() config: CaptchaConfig): Promise<CaptchaData> {
    return await this.genService.generateCaptcha('debug', config);
  }

  @Post('submit')
  async submitCaptcha(@Body() body: any): Promise<{ success: boolean }> {
    if (!body.hash || !body.response || !body.timestamp)
      throw new HttpException('Missing captcha data', HttpStatus.BAD_REQUEST);
    return {
      success: this.genService.verifyCaptcha(
        body.hash,
        body.response,
        'debug',
        body.timestamp,
      ),
    };
  }

  @Get()
  async getIndexHtml(): Promise<string> {
    return `
<!DOCTYPE html>
<html>
<body>
  <h1>Debugger</h1>
  <div>
    <label for="config">Captcha config:</label>
    <textarea id="config"></textarea>
  </div>
  <div>
    <button onclick="resetConfig()">Reset Config</button>
  </div>
  <button onclick="getCaptcha()">Get Captcha</button>
  <div style="margin-top: 1rem; margin-bottom: 1rem"><img id="captcha" src="" alt="Captcha" /></div>
  <div>
    <label for="hash">Captcha hash:</label>
    <input type="text" id="hash" value="" readonly>
  </div>
  <div>
    <label for="timestamp">Captcha timestamp:</label>
    <input type="text" id="timestamp" value="" readonly>
  </div>
  <div>
    <label for="response">Captcha response:</label>
    <input type="text" id="response" value="">
  </div>
  <button onclick="checkCaptcha()">Check Captcha</button>
  <p>Valid: <span id="valid">n/a</span></p>
  <script>
    const defaultConfig = ${JSON.stringify(new CaptchaConfig())};
    function resetConfig() {
      document.getElementById('config').value = JSON.stringify(defaultConfig, null, 2);
    }
    resetConfig();
    async function getCaptcha() {
      const config = JSON.parse(document.getElementById('config').value);
      const response = await fetch('/debug/captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const json = await response.json();
      document.getElementById('captcha').src = json.image;
      document.getElementById('hash').value = json.hash;
      document.getElementById('timestamp').value = json.timestamp;
      document.getElementById('response').value = '';
      document.getElementById('valid').innerText = 'n/a';
    }
    async function checkCaptcha() {
      const hash = document.getElementById('hash').value;
      const response = document.getElementById('response').value;
      const timestamp = document.getElementById('timestamp').value;
      const data = { hash, response, timestamp };
      const result = await fetch('/debug/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await result.json();
      document.getElementById('valid').innerText = json.success ? 'yes' : 'no';
    }
  </script>
</body>
`;
  }
}
