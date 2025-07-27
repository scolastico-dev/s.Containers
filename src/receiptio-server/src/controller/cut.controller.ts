import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrintService } from 'src/services/print.service';
import { QueueService } from 'src/services/queue.service';

@Controller()
@ApiTags('app')
export class CutController {
  constructor(
    private readonly print: PrintService,
    private readonly queue: QueueService,
  ) {}

  @Get('cut')
  async cutReceipt(): Promise<string> {
    const release = await this.queue.acquire();
    const res = await this.print.cutReceipt();
    release();
    return res;
  }
}
