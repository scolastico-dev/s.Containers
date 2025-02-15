import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from './config.service';
import axios, { AxiosError } from 'axios';

type OAuthConfig = {
  tokenUrl: string;
  authUrl: string;
  userInfoUrl: string;
};

@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name);
  private cache: OAuthConfig | null = null;
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

  async getAuthUrl(callbackUrl: string, state: string): Promise<string> {
    const cfg = await this.getConfig();
    const authUrl = new URL(cfg.authUrl);
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('redirect_uri', callbackUrl);
    authUrl.searchParams.append('client_id', this.config.CLIENT_ID);
    authUrl.searchParams.append('scope', this.config.OAUTH2_SCOPE);
    authUrl.searchParams.append('response_type', 'code');
    return authUrl.toString();
  }

  async getToken(redirectUrl: string, code: string): Promise<string> {
    const cfg = await this.getConfig();
    const params = new URLSearchParams();
    params.append('client_id', this.config.CLIENT_ID);
    params.append('client_secret', this.config.CLIENT_SECRET);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUrl);
    params.append('scope', this.config.OAUTH2_SCOPE);
    return await axios
      .post(cfg.tokenUrl, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${this.config.CLIENT_ID}:${this.config.CLIENT_SECRET}`,
          ).toString('base64')}`,
        },
      })
      .then((res) => res.data.access_token)
      .catch((err) => {
        if (err instanceof AxiosError) {
          this.logger.error('Code:', err.response?.status);
          this.logger.error('Data:', err.response?.data);
        }
        throw err;
      });
  }

  async getUserInfo(token: string): Promise<any> {
    const cfg = await this.getConfig();
    return await axios
      .get(cfg.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => res.data)
      .catch((err) => {
        if (err instanceof AxiosError) {
          this.logger.error('Code:', err.response?.status);
          this.logger.error('Data:', err.response?.data);
        }
        throw err;
      });
  }
}
