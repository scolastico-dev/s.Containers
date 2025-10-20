import { HttpException, Injectable } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IdLogger } from 'src/id.logger';
import { PrintService } from './print.service';
import { QueueService } from './queue.service';

export class PrintJobDTO {
  @ApiProperty()
  content?: string;
  @ApiProperty({
    enum: ['receiptio', 'raw', 'text', 'html', 'cut', 'png', 'qr', 'base64'],
    default: 'receiptio',
  })
  format?:
    | 'receiptio'
    | 'raw'
    | 'text'
    | 'html'
    | 'cut'
    | 'png'
    | 'qr'
    | 'base64';
  @ApiProperty({
    enum: ['left', 'center', 'right'],
    default: 'left',
  })
  align?: 'left' | 'center' | 'right';
  @ApiProperty({
    type: Number,
    default: 1,
    description: 'Width of the Image / QR Code in percentage (0.01 to 1.0)',
  })
  width?: number;
}

@Injectable()
export class JobService {
  constructor(
    private readonly logger: IdLogger,
    private readonly print: PrintService,
    private readonly queue: QueueService,
  ) {
    this.logger.setContext(JobService.name);
  }

  /**
   * Validates and processes an array of print jobs
   * @param jobs Array of print jobs to process
   * @param throwOnError Whether to throw exceptions on validation errors (for API) or log and continue (for pull)
   * @returns Array of processing results
   */
  async processJobs(
    jobs: PrintJobDTO[],
    throwOnError = true,
  ): Promise<string[]> {
    if (!jobs) {
      if (throwOnError) throw new HttpException('No jobs provided', 400);
      this.logger.error('No jobs provided');
      return [];
    }

    const release = await this.queue.acquire();
    try {
      const results: string[] = [];

      for (const job of jobs) {
        try {
          const result = await this.processJob(job, throwOnError);
          if (result) results.push(result);
        } catch (error) {
          release();
          throw error;
        }
      }

      return results;
    } finally {
      release();
    }
  }

  /**
   * Validates and processes a single print job
   * @param job The print job to process
   * @param throwOnError Whether to throw exceptions on validation errors or log and continue
   * @returns Processing result string or null if job was skipped
   */
  private async processJob(
    job: PrintJobDTO,
    throwOnError = true,
  ): Promise<string | null> {
    // Set default format
    if (!job.format) job.format = 'receiptio';

    // Validate content for non-cut jobs
    if (job.format !== 'cut' && !job.content) {
      const error = 'Job content is empty';
      if (throwOnError) throw new HttpException(error, 400);
      this.logger.error(error);
      return null;
    }

    // Validate alignment
    if (!['left', 'center', 'right', undefined].includes(job.align)) {
      const error = `Unknown alignment: ${job.align}`;
      if (throwOnError) throw new HttpException(error, 400);
      this.logger.error(error);
      job.align = 'left';
    }

    // Set default alignment
    if (!job.align) job.align = 'left';

    // Validate and set default width
    if (!job.width) job.width = 1;
    if (isNaN(job.width) || job.width <= 0 || job.width > 1) {
      const error = `Invalid width: ${job.width}`;
      if (throwOnError) throw new HttpException(error, 400);
      this.logger.error(error);
      job.width = 1;
    }

    // Process job based on format
    switch (job.format) {
      case 'cut':
        return await this.print.cutReceipt();

      case 'receiptio':
        return await this.print.printReceipt(job.content);

      case 'raw':
        return await this.print.printRaw(Buffer.from(job.content, 'ascii'));

      case 'base64':
        return await this.print.printRaw(Buffer.from(job.content, 'base64'));

      case 'html':
        return await this.print.printHtml(job.content);

      case 'text':
        return await this.print.printText(job.content, job.align as any);

      case 'png':
        const buffer = Buffer.from(job.content, 'base64');
        return await this.print.printPng(buffer, job.width, job.align as any);

      case 'qr':
        return await this.print.printQrCode(
          job.content,
          job.width,
          job.align as any,
        );

      default:
        const error = `Unknown format: ${job.format}`;
        if (throwOnError) throw new HttpException(error, 400);
        this.logger.error(error);
        return null;
    }
  }
}
