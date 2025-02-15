import { Injectable } from '@nestjs/common';
import { ConfigService } from './config.service';
import { createHash } from 'crypto';
import axios from 'axios';

type OAuthConfig = {
  tokenUrl: string;
  authUrl: string;
  userInfoUrl: string;
};

@Injectable()
export class OidcService {
  private cache;
  constructor(private readonly config: ConfigService) {}

  async getConfig(): Promise<OAuthConfig> {
    if (this.cache) return this.cache;
    if (this.config.OIDC_ISSUER_URL) {
      const { data } = await axios.get(this.config.OIDC_ISSUER_URL);
      this.cache = {
        tokenUrl: data.token_endpoint,
        authUrl: data.authorization_endpoint,
        userInfoUrl: data.userinfo_endpoint,
      };
    } else {
      this.cache = {
        tokenUrl: this.config.OAUTH2_TOKEN_URL,
        authUrl: this.config.OAUTH2_AUTH_URL,
        userInfoUrl: this.config.OAUTH2_USER_INFO_URL,
      };
    }
    return this.cache;
  }

  sha256sum(data: string): string {
    return createHash('sha256')
      .update(this.config.JWT_SECRET + data)
      .digest('hex');
  }

  async getAuthUrl(callbackUrl: string): Promise<string> {
    const cfg = await this.getConfig();
    const authUrl = new URL(cfg.authUrl);
    authUrl.searchParams.append('client_id', this.config.CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', callbackUrl);
    authUrl.searchParams.append('scope', this.config.OAUTH2_SCOPE);
    authUrl.searchParams.append('response_type', 'code');
    return authUrl.toString();
  }

  async getToken(code: string): Promise<string> {
    const cfg = await this.getConfig();
    const token = new URLSearchParams({
      client_id: this.config.CLIENT_ID,
      client_secret: this.config.CLIENT_SECRET,
      redirect_uri: this.config.REDIRECT_URL,
      grant_type: 'authorization_code',
      code,
    });
    return await axios
      .post(cfg.tokenUrl, token)
      .then((res) => res.data.access_token);
  }

  async getUserInfo(token: string): Promise<any> {
    const cfg = await this.getConfig();
    return await axios
      .get(cfg.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => res.data);
  }
}
