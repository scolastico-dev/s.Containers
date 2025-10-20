import { Injectable, OnModuleInit } from '@nestjs/common';
import { IdLogger } from 'src/id.logger';
import { CfgService } from './cfg.service';
import { JobService } from './job.service';
import axios from 'axios';

@Injectable()
export class PullService implements OnModuleInit {
  constructor(
    private readonly logger: IdLogger,
    private readonly cfg: CfgService,
    private readonly jobService: JobService,
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

    try {
      await this.jobService.processJobs(res.data, false);
    } catch (error) {
      this.logger.error('Error processing jobs from pull', error);
    } finally {
      this.startPull();
    }
  }
}
