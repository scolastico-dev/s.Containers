import { Injectable, Scope } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AppLogger } from './app.logger';

@Injectable({ scope: Scope.TRANSIENT })
export class IdLogger {
  constructor(
    private readonly cls: ClsService,
    private readonly logger: AppLogger,
  ) {}

  setContext(context: string): void {
    this.logger.setContext(context);
  }

  error(message: unknown, ...data: unknown[]): void {
    const requestId = this.cls.getId();
    if (!requestId) this.logger.error(message, ...data);
    else this.logger.error(`<${requestId}> ${message}`, ...data);
  }

  warn(message: unknown, ...data: unknown[]): void {
    const requestId = this.cls.getId();
    if (!requestId) this.logger.warn(message, ...data);
    else this.logger.warn(`<${requestId}> ${message}`, ...data);
  }

  log(message: unknown, ...data: unknown[]): void {
    const requestId = this.cls.getId();
    if (!requestId) this.logger.log(message, ...data);
    else this.logger.log(`<${requestId}> ${message}`, ...data);
  }

  debug(message: unknown, ...data: unknown[]): void {
    const requestId = this.cls.getId();
    if (!requestId) this.logger.debug(message, ...data);
    else this.logger.debug(`<${requestId}> ${message}`, ...data);
  }

  verbose(message: unknown, ...data: unknown[]): void {
    const requestId = this.cls.getId();
    if (!requestId) this.logger.verbose(message, ...data);
    else this.logger.verbose(`<${requestId}> ${message}`, ...data);
  }

  fatal(message: unknown, ...data: unknown[]): void {
    const requestId = this.cls.getId();
    if (!requestId) this.logger.fatal(message, ...data);
    else this.logger.fatal(`<${requestId}> ${message}`, ...data);
  }
}
