import { Controller, Get, HttpStatus, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from './config.service';
import { OidcService } from './oidc.service';
import { Response, Request } from 'express';
import { JwtService } from './jwt.service';
import { isPrivate } from 'ip';

@Controller()
export class AppController {
  constructor(
    private readonly config: ConfigService,
    private readonly oidc: OidcService,
    private readonly jwt: JwtService,
  ) {}

  @Get()
  getIndex(@Res() res: Response): void {
    if (!this.config.REDIRECT_URL) res.send('Redirect URL not set');
    else res.redirect(this.config.REDIRECT_URL);
  }

  @Get('auth')
  async getAuth(
    @Req() req: Request,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('hash') hash?: string,
  ): Promise<void> {
    if (!from || !hash) return res.redirect('/');

    if (this.oidc.sha256sum(from) !== hash) {
      res.status(HttpStatus.UNAUTHORIZED).send('Invalid hash');
      return;
    }

    const url = new URL(this.config.AUTH_HOST);
    url.pathname = '/callback';
    url.searchParams.append('from', from);
    url.searchParams.append('hash', hash);
    res.redirect(await this.oidc.getAuthUrl(url.toString()));
  }

  @Get('callback')
  async getCallback(
    @Res() res: Response,
    @Query('from') from: string,
    @Query('hash') hash: string,
    @Query('code') code: string,
    @Query('error') error?: string,
  ): Promise<void> {
    if (error) {
      res.status(HttpStatus.UNAUTHORIZED).send(error);
      return;
    }

    if (!from || !hash || !code) {
      res
        .header({ Refresh: '5; url=/' })
        .status(HttpStatus.UNAUTHORIZED)
        .send('Invalid request');
      return;
    }

    if (this.oidc.sha256sum(from) !== hash) {
      res.status(HttpStatus.UNAUTHORIZED).send('Invalid hash');
      return;
    }

    const token = await this.oidc.getToken(code);
    const user = await this.oidc.getUserInfo(token);
    const jwt = this.jwt.sign({
      user,
      sub: new URL(from).hostname,
      exp: Math.floor(Date.now() / 1000) + this.config.JWT_TTL,
    });

    const url = new URL(from);
    url.searchParams.append(this.config.COOKIE_NAME + '_TOKEN', jwt);
    url.searchParams.append(this.config.COOKIE_NAME + '_URL', from);
    res.redirect(url.toString());
  }

  @Get('traefik')
  getTraefik(@Res() res: Response, @Req() req: Request): void {
    if (!isPrivate(req.ip)) {
      res
        .status(511)
        .send('This service is only available on a private network');
      return;
    }

    if (req.query) {
      const token = req.query[this.config.COOKIE_NAME + '_TOKEN'];
      const url = req.query[this.config.COOKIE_NAME + '_URL'];
      if (token && url) {
        res
          .setHeader('Refresh', '1; url=' + url)
          .cookie(this.config.COOKIE_NAME, token, {
            secure: this.config.COOKIE_SECURE,
            httpOnly: true,
          })
          .send('Writing cookie...');
        return;
      }
    }

    if (req.cookies) {
      const token = req.cookies[this.config.COOKIE_NAME];
      if (token) {
        const payload = this.jwt.validate<{ exp: number; sub: string }>(token);
        if (
          payload &&
          payload.exp > Math.floor(Date.now() / 1000) &&
          payload.sub === req.hostname
        ) {
          res.sendStatus(200);
          return;
        }
      }
    }

    const from =
      (req.headers['x-forwarded-uri'] as string) || this.config.AUTH_HOST;
    const hash = this.oidc.sha256sum(from);
    const url = new URL(this.config.AUTH_HOST);
    url.pathname = '/auth';
    url.searchParams.append('from', from);
    url.searchParams.append('hash', hash);
    res.redirect(url.toString());
  }
}
