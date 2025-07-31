import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ClsModule } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { AppController } from './controller/app.controller';
import { CutController } from './controller/cut.controller';
import { ImageController } from './controller/image.controller';
import { PrintController } from './controller/print.controller';
import { JobController } from './controller/job.controller';
import { CfgService } from './services/cfg.service';
import { CacheService } from './services/cache.service';
import { QueueService } from './services/queue.service';
import { PrintService } from './services/print.service';
import { AppLogger } from './app.logger';
import { IdLogger } from './id.logger';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: () => randomUUID(),
      },
    }),
  ],
  controllers: [
    AppController,
    CutController,
    ImageController,
    PrintController,
    JobController,
  ],
  providers: [
    AppLogger,
    IdLogger,
    CfgService,
    CacheService,
    QueueService,
    PrintService,
  ],
  exports: [AppLogger],
})
export class AppModule {}
