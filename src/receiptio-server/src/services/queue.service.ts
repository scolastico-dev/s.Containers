import { Injectable } from '@nestjs/common';
import { IdLogger } from 'src/id.logger';

export type Release = () => void;

@Injectable()
export class QueueService {
  constructor(private readonly logger: IdLogger) {
    this.logger.setContext(QueueService.name);
  }
  private waiting: Array<() => void> = [];
  private processing = false;

  acquire(): Promise<Release> {
    return new Promise<Release>((resolve) => {
      const grant = () => {
        let released = false;
        this.processing = true;
        // eslint-disable-next-line prefer-const
        let release: Release;
        const timeout = setTimeout(() => {
          this.logger.warn('Timeout while waiting for release');
          release();
        }, 300_000);

        release = () => {
          this.logger.log('Releasing queue');
          if (released) return;
          released = true;
          clearTimeout(timeout);
          this.processing = false;
          this.dispatchNext();
        };

        this.logger.log('Queue acquired, processing');
        resolve(release);
      };

      if (!this.processing) {
        grant();
      } else {
        this.logger.log('Queue is busy, adding to waiting list');
        this.waiting.push(grant);
      }
    });
  }

  async runExclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  private dispatchNext() {
    if (this.processing) return;
    const next = this.waiting.shift();
    if (next) queueMicrotask(next);
  }
}
