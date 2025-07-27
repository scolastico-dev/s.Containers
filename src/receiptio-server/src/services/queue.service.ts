import { Injectable } from '@nestjs/common';

export type Release = () => void;

@Injectable()
export class QueueService {
  private waiting: Array<() => void> = [];
  private processing = false;
  private destroyed = false;

  acquire(): Promise<Release> {
    return new Promise<Release>((resolve) => {
      const grant = () => {
        let released = false;
        this.processing = true;

        const release: Release = () => {
          if (released) return;
          released = true;
          this.processing = false;
          this.dispatchNext();
        };

        resolve(release);
      };

      if (!this.processing) {
        grant();
      } else {
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
