import { Injectable } from '@nestjs/common';
import { ConfigService } from './config.service';
import { createHmac, randomUUID } from 'crypto';

@Injectable()
export class JwtService {
  constructor(private readonly config: ConfigService) {}

  btoa(input: string): string {
    return Buffer.from(input).toString('base64url');
  }

  atob(input: string): string {
    return Buffer.from(
      input.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString();
  }

  sha256sum(data: string): string {
    return createHmac('sha256', this.config.JWT_SECRET)
      .update(data)
      .digest('base64url');
  }

  sign(payload: object): string {
    payload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      jti: randomUUID(),
    };

    const jwtHeader = this.btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const jwtPayload = this.btoa(JSON.stringify(payload));
    const jwtSignature = this.sha256sum(jwtHeader + '.' + jwtPayload);

    return jwtHeader + '.' + jwtPayload + '.' + jwtSignature;
  }

  validate<T>(jwt: string): T | false {
    try {
      const [jwtHeader, jwtPayload, jwtSignature] = jwt.split('.');
      if (!jwtHeader || !jwtPayload || !jwtSignature) return false;
      const hash = this.sha256sum(jwtHeader + '.' + jwtPayload);
      if (hash !== jwtSignature) return false;
      return JSON.parse(this.atob(jwtPayload)) as T;
    } catch {
      return false;
    }
  }

  getPayload<T>(jwt: string): T {
    const [, jwtPayload] = jwt.split('.');
    return JSON.parse(this.atob(jwtPayload)) as T;
  }
}
