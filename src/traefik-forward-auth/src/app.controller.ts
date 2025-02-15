import {
  Controller,
  Get,
  HttpStatus,
  Logger,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from './config.service';
import { OidcService } from './oidc.service';
import { Response, Request } from 'express';
import { JwtService } from './jwt.service';
import { isPrivate } from 'ip';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

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

  @Get('callback')
  async getCallback(
    @Res() res: Response,
    @Query('state') state: string,
    @Query('code') code: string,
    @Query('error') error?: string,
  ): Promise<void> {
    if (error) {
      res.status(HttpStatus.UNAUTHORIZED).send(error);
      this.logger.error(
        'Error during callback',
        error.replaceAll(/[^a-zA-Z0-9-,. ]/g, ''),
      );
      return;
    }

    if (!state || !code) {
      res
        .header({ Refresh: '5; url=/' })
        .status(HttpStatus.UNAUTHORIZED)
        .send('Invalid request');
      this.logger.warn('Invalid request');
      return;
    }

    const [fromRaw, hash] = state.split('.');
    if (typeof fromRaw !== 'string' || typeof hash !== 'string') {
      res.status(HttpStatus.UNAUTHORIZED).send('Invalid state');
      this.logger.warn('Invalid state');
      return;
    }

    const from = this.jwt.atob(fromRaw);

    if (this.jwt.sha256sum(from) !== hash) {
      res.status(HttpStatus.UNAUTHORIZED).send('Invalid hash');
      this.logger.warn('Invalid hash');
      return;
    }

    const callbackUrl = new URL(this.config.AUTH_HOST);
    callbackUrl.pathname = '/callback';

    const token = await this.oidc.getToken(callbackUrl.toString(), code);
    const user = await this.oidc.getUserInfo(token);
    const jwt = this.jwt.sign({
      user,
      sub: new URL(from).hostname,
      exp: Math.floor(Date.now() / 1000) + this.config.JWT_TTL,
    });

    const url = new URL(from);
    url.searchParams.append(this.config.COOKIE_NAME + '_TOKEN', jwt);
    url.searchParams.append(this.config.COOKIE_NAME + '_URL', from);

    this.logger.log('Redirecting user back after successful auth to: ' + from);

    res.redirect(url.toString());
  }

  @Get('auth')
  getAuth(@Res() res: Response, @Req() req: Request): Promise<void> {
    return this.getTraefik(res, req);
  }

  @Get('traefik')
  async getTraefik(@Res() res: Response, @Req() req: Request): Promise<void> {
    if (!isPrivate(req.ip)) {
      res
        .status(511)
        .send('This service is only available on a private network');
      this.logger.error('Request from public network');
      return;
    }

    const host = req.headers['x-forwarded-host'];
    const proto = req.headers['x-forwarded-proto'];
    const uri = req.headers['x-forwarded-uri'];

    if (
      typeof host !== 'string' ||
      typeof proto !== 'string' ||
      typeof uri !== 'string'
    ) {
      res.status(HttpStatus.UNAUTHORIZED).send('Invalid request');
      this.logger.warn('Invalid request');
      return;
    }

    const queryUrl = new URL(`${proto}://${host}${uri}`);

    const qToken = this.config.COOKIE_NAME + '_TOKEN';
    const qUrl = this.config.COOKIE_NAME + '_URL';
    if (queryUrl.searchParams.has(qToken) && queryUrl.searchParams.has(qUrl)) {
      const token = queryUrl.searchParams.get(qToken);
      const url = queryUrl.searchParams.get(qUrl);
      if (
        typeof token === 'string' &&
        typeof url === 'string' &&
        this.jwt.validate(token)
      ) {
        this.logger.log('Received valid token for host: ' + queryUrl.hostname);
        res
          .setHeader('Refresh', '1; url=' + url)
          .cookie(this.config.COOKIE_NAME, token, {
            secure: this.config.COOKIE_SECURE,
            httpOnly: true,
          })
          .status(HttpStatus.FORBIDDEN)
          .send(
            [
              'Writing cookie... If you ware not redirected, click',
              `<a href="${url}">here</a>`,
            ].join(' '),
          );
        return;
      }
    }

    if (req.cookies) {
      const token = req.cookies[this.config.COOKIE_NAME];
      if (typeof token === 'string') {
        const payload = this.jwt.validate<{ exp: number; sub: string }>(token);
        if (
          payload &&
          payload.exp > Math.floor(Date.now() / 1000) &&
          payload.sub === queryUrl.hostname
        ) {
          res.sendStatus(200);
          return;
        }
      }
    }

    const from = queryUrl.toString();
    const hash = this.jwt.sha256sum(from);

    const url = new URL(this.config.AUTH_HOST);
    url.pathname = '/callback';
    this.logger.log(
      'Redirecting user to auth provider for host: ' + queryUrl.hostname,
    );
    res.redirect(
      await this.oidc.getAuthUrl(
        url.toString(),
        [this.jwt.btoa(from), hash].join('.'),
      ),
    );
  }
}
