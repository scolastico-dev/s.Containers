import {
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Block } from '@aws-sdk/client-textract';
import { CfgService } from './cfg.service';
import { OcrService } from './ocr.service';
import { S3Service } from './s3.service';
import { v4 as uuidv4 } from 'uuid';

export type JobStatus = 'processing' | 'completed' | 'failed';
export interface JobData {
  status: JobStatus;
  blocks?: Block[];
  error?: string;
  startTime?: string;
  completedTime?: string;
  failedTime?: string;
}

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private cfgService: CfgService,
    private ocrService: OcrService,
    private s3Service: S3Service,
  ) {}

  async processSync(buffer: Buffer): Promise<JobData & { id: string }> {
    const job = await this.startAsync(buffer);
    do {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (!(await this.getAsync(job)));
    return { id: job, ...((await this.getAsync(job)) as JobData) };
  }

  async startAsync(buffer: Buffer): Promise<string> {
    try {
      const jobId = uuidv4();
      this.logger.log(`Starting async job ${jobId}`);
      await this.s3Service.uploadBuffer(buffer, jobId);
      await this.cacheManager.set(
        `job:${jobId}`,
        {
          status: 'processing',
          startTime: new Date().toISOString(),
        } as JobData,
        this.cfgService.asyncCacheTtl * 1000,
      );

      this.processAsyncJob(jobId).catch(async (error) => {
        this.logger.error(`Async job ${jobId} failed: ${error.message}`);
        this.s3Service
          .delete(jobId)
          .catch(() =>
            this.logger.error(`Failed to delete S3 object ${jobId}`),
          );
        await this.cacheManager.set(
          `job:${jobId}`,
          {
            status: 'failed',
            error: error.message,
          } as JobData,
          this.cfgService.asyncCacheTtl * 1000,
        );
      });

      return jobId;
    } catch {
      throw new HttpException(
        'Failed to start async job',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAsync(id: string): Promise<JobData | null | false> {
    const job = await this.cacheManager.get<JobData>(`job:${id}`);

    if (!job) return null;
    if (job.status === 'processing') return false;
    if (job.status === 'failed')
      throw new HttpException(
        `Job failed: ${job.error}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    return job;
  }

  private async processAsyncJob(jobId: string): Promise<void> {
    const blocks = await this.ocrService.detectText(jobId);
    await this.cacheManager.set(
      `job:${jobId}`,
      {
        status: 'completed',
        blocks: blocks,
        completedTime: new Date().toISOString(),
      } as JobData,
      this.cfgService.asyncCacheTtl * 1000,
    );
    setTimeout(async () => {
      await this.s3Service.delete(jobId);
    }, this.cfgService.asyncCacheTtl * 1000);
    this.logger.log(`Async job ${jobId} completed successfully`);
  }
}
