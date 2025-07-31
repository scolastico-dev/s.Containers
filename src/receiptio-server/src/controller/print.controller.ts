import { Body, Controller, HttpException, Post, Query } from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PrintService } from 'src/services/print.service';
import { QueueService } from 'src/services/queue.service';

@Controller()
@ApiTags('app')
export class PrintController {
  constructor(
    private readonly print: PrintService,
    private readonly queue: QueueService,
  ) {}

  @Post('print')
  @ApiBody({
    description: 'Print a receipt',
    type: String,
  })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Format of the receipt to print (default: "receiptio")',
    enum: ['receiptio', 'raw', 'text', 'html', 'qr'],
  })
  @ApiQuery({
    name: 'align',
    required: false,
    description: 'Alignment of the receipt if using text format',
    enum: ['left', 'center', 'right'],
    default: 'left',
  })
  @ApiQuery({
    name: 'cut',
    required: false,
    description: 'If true, cut the receipt after printing',
    enum: ['true', 'false'],
    default: 'false',
  })
  @ApiQuery({
    name: 'width',
    required: false,
    default: 1,
    type: 'number',
    description: 'Width of the QR Code in percentage (0.01 to 1.0)',
  })
  @ApiConsumes('text/plain')
  async printReceipt(
    @Body() receipt: string,
    @Query('format') format: string,
    @Query('align') align: string,
    @Query('cut') cut: string,
    @Query('width') width: string,
  ): Promise<string> {
    if (!receipt) throw new HttpException('Receipt content is empty', 400);
    if (!['left', 'center', 'right', undefined].includes(align))
      throw new HttpException(`Unknown alignment: ${align}`, 400);
    if (!align) align = 'left';
    if (!width) width = '1';
    const widthValue = parseFloat(width);
    if (isNaN(widthValue) || widthValue <= 0 || widthValue > 1)
      throw new HttpException(`Invalid width: ${width}`, 400);
    const release = await this.queue.acquire();
    try {
      let result: string;
      switch (format) {
        case 'receiptio':
          result = await this.print.printReceipt(receipt);
          break;
        case 'raw':
          result = await this.print.printRaw(Buffer.from(receipt, 'ascii'));
          break;
        case 'html':
          result = await this.print.printHtml(receipt);
          break;
        case 'text':
          result = await this.print.printText(receipt, align as any);
          break;
        case 'qr':
          result = await this.print.printQrCode(
            receipt,
            widthValue,
            align as any,
          );
          break;
        default:
          release();
          throw new HttpException(`Unknown format: ${format}`, 400);
      }
      if (cut === 'true') await this.print.cutReceipt();
      release();
      return result;
    } catch (error) {
      release();
      throw error;
    }
  }
}
