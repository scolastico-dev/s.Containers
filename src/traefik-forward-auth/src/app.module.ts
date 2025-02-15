import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigService } from './config.service';
import { OidcService } from './oidc.service';
import { JwtService } from './jwt.service';

@Module({
  controllers: [AppController],
  providers: [ConfigService, OidcService, JwtService],
})
export class AppModule {}
