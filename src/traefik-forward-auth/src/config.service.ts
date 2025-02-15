import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  public readonly CLIENT_ID: string = process.env.CLIENT_ID || '';
  public readonly CLIENT_SECRET: string = process.env.CLIENT_SECRET || '';
  public readonly OIDC_ISSUER_URL: string = process.env.OIDC_ISSUER_URL || '';
  public readonly OAUTH2_TOKEN_URL: string = process.env.OAUTH2_TOKEN_URL || '';
  public readonly OAUTH2_AUTH_URL: string = process.env.OAUTH2_AUTH_URL || '';
  public readonly OAUTH2_USER_INFO_URL: string =
    process.env.OAUTH2_USER_INFO_URL || '';
  public readonly OAUTH2_SCOPE: string = process.env.OAUTH2_SCOPE || 'openid';
  public readonly JWT_SECRET: string =
    process.env.JWT_SECRET || Math.random().toString(36).substring(2);
  public readonly JWT_TTL: number = parseInt(process.env.JWT_TTL || '3600');
  public readonly AUTH_HOST: string = process.env.AUTH_HOST || '';
  public readonly REDIRECT_URL: string = process.env.REDIRECT_URL || '';
  public readonly COOKIE_NAME: string =
    process.env.COOKIE_NAME || 'X_FORWARD_AUTH';
  public readonly COOKIE_SECURE: boolean =
    process.env.COOKIE_SECURE !== 'false';
  public readonly COOKIE_HTTP_ONLY: boolean =
    process.env.COOKIE_HTTP_ONLY !== 'false';

  constructor() {
    if (!this.CLIENT_ID) throw new Error('CLIENT_ID is required');
    if (!this.CLIENT_SECRET) throw new Error('CLIENT_SECRET is required');
    if (!this.OIDC_ISSUER_URL) {
      if (!this.OAUTH2_TOKEN_URL)
        throw new Error('OIDC_ISSUER_URL is required');
      if (!this.OAUTH2_AUTH_URL) throw new Error('OIDC_ISSUER_URL is required');
      if (!this.OAUTH2_USER_INFO_URL)
        throw new Error('OIDC_ISSUER_URL is required');
    }
    if (!this.JWT_SECRET) throw new Error('JWT_SECRET is required');
    if (!this.JWT_TTL) throw new Error('JWT_TTL is required');
    if (!this.AUTH_HOST) throw new Error('AUTH_HOST is required');
    if (!this.COOKIE_NAME) throw new Error('COOKIE_NAME is required');
  }
}
