import { Body, Controller, HttpException, Post } from '@nestjs/common';
import { ApiBody, ApiProperty, ApiTags } from '@nestjs/swagger';
import { PrintService } from 'src/services/print.service';
import { QueueService } from 'src/services/queue.service';

export class PrintJobDTO {
  @ApiProperty()
  content?: string;
  @ApiProperty({
    enum: ['receiptio', 'raw', 'text', 'html', 'cut', 'png', 'qr'],
    default: 'receiptio',
  })
  format?: 'receiptio' | 'raw' | 'text' | 'html' | 'cut' | 'png' | 'qr';
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

@Controller()
@ApiTags('app')
export class JobController {
  constructor(
    private readonly print: PrintService,
    private readonly queue: QueueService,
  ) {}

  @Post('job')
  @ApiBody({
    description: 'Start a print job',
    type: PrintJobDTO,
    required: true,
    isArray: true,
  })
  async printReceipt(@Body() jobs: PrintJobDTO[]): Promise<string[]> {
    if (!jobs) throw new HttpException('No jobs provided', 400);
    const release = await this.queue.acquire();
    try {
      const res: string[] = [];
      for (const job of jobs) {
        if (!job.format) job.format = 'receiptio';
        if (job.format !== 'cut' && !job.content) {
          release();
          throw new HttpException('Job content is empty', 400);
        }
        if (!['left', 'center', 'right', undefined].includes(job.align)) {
          release();
          throw new HttpException(`Unknown alignment: ${job.align}`, 400);
        }
        if (!job.width) job.width = 1;
        if (isNaN(job.width) || job.width <= 0 || job.width > 1) {
          release();
          throw new HttpException(`Invalid width: ${job.width}`, 400);
        }
        if (!job.align) job.align = 'left';
        switch (job.format) {
          case 'cut':
            res.push(await this.print.cutReceipt());
            break;
          case 'receiptio':
            res.push(await this.print.printReceipt(job.content));
            break;
          case 'raw':
            res.push(
              await this.print.printRaw(Buffer.from(job.content, 'ascii')),
            );
            break;
          case 'html':
            res.push(await this.print.printHtml(job.content));
            break;
          case 'text':
            res.push(await this.print.printText(job.content, job.align as any));
            break;
          case 'png':
            const buffer = Buffer.from(job.content, 'base64');
            res.push(
              await this.print.printPng(buffer, job.width, job.align as any),
            );
            break;
          case 'qr':
            res.push(
              await this.print.printQrCode(
                job.content,
                job.width,
                job.align as any,
              ),
            );
            break;
          default:
            release();
            throw new HttpException(`Unknown format: ${job.format}`, 400);
        }
      }
      release();
      return res;
    } catch (error) {
      release();
      throw error;
    }
  }
}
