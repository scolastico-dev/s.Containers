import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-store';
import { OcrService } from './services/ocr.service';
import { AsyncController } from './controller/async.controller';
import { SyncController } from './controller/sync.controller';
import { AppController } from './controller/app.controller';
import { CfgService } from './services/cfg.service';
import { ConvertController } from './controller/convert.controller';
import { JobService } from './services/job.service';
import { S3Service } from './services/s3.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [AppModule],
      inject: [CfgService],
      useFactory: (config: CfgService) => ({
        store: config.redisEnabled ? redisStore : undefined,
        host: config.redisHost,
        port: config.redisPort,
      }),
      isGlobal: true,
    }),
  ],
  providers: [CfgService, OcrService, JobService, S3Service],
  controllers: [
    AppController,
    ConvertController,
    AsyncController,
    SyncController,
  ],
  exports: [CfgService],
})
export class AppModule {}
