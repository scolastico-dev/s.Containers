import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { CfgService } from './services/cfg.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  constructor(private readonly cfg: CfgService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.cfg.basicAuthUsername || !this.cfg.basicAuthPassword) return true;
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      this.logger.warn('No Authorization header provided');
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    const [authType, credentials] = authHeader.split(' ');
    if (authType !== 'Basic' || !credentials) {
      this.logger.warn('Invalid Authorization header format');
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    const [username, password] = Buffer.from(credentials, 'base64')
      .toString('utf-8')
      .split(':');
    if (
      username !== this.cfg.basicAuthUsername ||
      password !== this.cfg.basicAuthPassword
    ) {
      this.logger.warn('Invalid credentials provided');
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return true;
  }
}
