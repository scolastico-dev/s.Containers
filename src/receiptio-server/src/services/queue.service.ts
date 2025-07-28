import { Injectable } from '@nestjs/common';

export type Release = () => void;

@Injectable()
export class QueueService {
  private waiting: Array<() => void> = [];
  private processing = false;

  acquire(): Promise<Release> {
    return new Promise<Release>((resolve) => {
      const grant = () => {
        let released = false;
        this.processing = true;
        // eslint-disable-next-line prefer-const
        let release: Release;
        const timeout = setTimeout(() => release(), 300_000);

        release = () => {
          if (released) return;
          released = true;
          clearTimeout(timeout);
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
