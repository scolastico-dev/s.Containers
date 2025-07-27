import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { PrintService } from 'src/services/print.service';
import { QueueService } from 'src/services/queue.service';

@Controller()
@ApiTags('app')
export class ImageController {
  constructor(
    private readonly print: PrintService,
    private readonly queue: QueueService,
  ) {}

  @Post('image')
  @ApiBody({
    description: 'Print an png image',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
    required: true,
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async printImage(@UploadedFile() file: Express.Multer.File): Promise<string> {
    const release = await this.queue.acquire();
    const res = await this.print.printPng(file.buffer);
    release();
    return res;
  }
}
