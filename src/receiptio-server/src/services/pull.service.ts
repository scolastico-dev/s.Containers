import { Injectable, OnModuleInit } from '@nestjs/common';
import { IdLogger } from 'src/id.logger';
import { CfgService } from './cfg.service';
import { PrintService } from './print.service';
import { QueueService } from './queue.service';
import axios from 'axios';

export type Release = () => void;

@Injectable()
export class PullService implements OnModuleInit {
  constructor(
    private readonly logger: IdLogger,
    private readonly cfg: CfgService,
    private readonly print: PrintService,
    private readonly queue: QueueService,
  ) {
    this.logger.setContext(PullService.name);
  }

  onModuleInit() {
    if (this.cfg.pullUrl) this.startPull();
  }

  private startPull(): void {
    setTimeout(this.doPull.bind(this), this.cfg.pullInterval);
  }

  private async doPull(): Promise<void> {
    const res = await axios.get(this.cfg.pullUrl, {
      validateStatus(status) {
        return (status >= 200 && status < 300) || status === 404;
      },
    });

    this.logger.log(`Pull response status: ${res.status}`);
    if (res.status === 404) return this.startPull();
    const resolve = await this.queue.acquire();
    this.logger.log(`Acquired queue for pull processing`);

    try {
      for (const job of res.data) {
        if (!job.format) job.format = 'receiptio';
        if (job.format !== 'cut' && !job.content) {
          this.logger.error('Job content is empty');
          continue;
        }
        if (!['left', 'center', 'right', undefined].includes(job.align)) {
          this.logger.error(`Invalid alignment: ${job.align}`);
          job.align = 'left';
        }
        if (!job.width) job.width = 1;
        if (isNaN(job.width) || job.width <= 0 || job.width > 1) {
          this.logger.error(`Invalid width: ${job.width}`);
          job.width = 1;
        }
        if (!job.align) job.align = 'left';
        switch (job.format) {
          case 'cut':
            await this.print.cutReceipt();
            break;
          case 'receiptio':
            await this.print.printReceipt(job.content);
            break;
          case 'raw':
            await this.print.printRaw(Buffer.from(job.content, 'ascii'));
            break;
          case 'base64':
            await this.print.printRaw(Buffer.from(job.content, 'base64'));
          case 'html':
            await this.print.printHtml(job.content);
            break;
          case 'text':
            await this.print.printText(job.content, job.align as any);
            break;
          case 'png':
            const buffer = Buffer.from(job.content, 'base64');
            await this.print.printPng(buffer, job.width, job.align as any);
            break;
          case 'qr':
            await this.print.printQrCode(
              job.content,
              job.width,
              job.align as any,
            );
            break;
          default:
            this.logger.error(`Unknown format: ${job.format}`);
        }
      }
    } finally {
      this.logger.log('Pull completed, releasing queue');
      resolve();
      this.startPull();
    }
  }
}
