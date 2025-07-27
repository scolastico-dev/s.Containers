import { Module } from '@nestjs/common';
import { AppController } from './controller/app.controller';
import { CutController } from './controller/cut.controller';
import { ImageController } from './controller/image.controller';
import { PrintController } from './controller/print.controller';
import { CfgService } from './services/cfg.service';
import { QueueService } from './services/queue.service';
import { PrintService } from './services/print.service';
import { JobController } from './controller/job.controller';

@Module({
  imports: [],
  controllers: [
    AppController,
    CutController,
    ImageController,
    PrintController,
    JobController,
  ],
  providers: [CfgService, QueueService, PrintService],
})
export class AppModule {}
