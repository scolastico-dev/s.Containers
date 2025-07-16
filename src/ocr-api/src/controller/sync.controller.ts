import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from '../services/ocr.service';
import { Response } from 'express';
import { ApiBody, ApiConsumes, ApiCreatedResponse } from '@nestjs/swagger';
import { JobService } from 'src/services/job.service';
import { S3Service } from 'src/services/s3.service';

@Controller('sync')
export class SyncController {
  constructor(
    private readonly job: JobService,
    private readonly ocr: OcrService,
    private readonly s3Service: S3Service,
  ) {}

  @Post('file')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50_000_000 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload a single file',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'OCR processed PDF file',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async syncFile(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    const content = await this.job.processSync(file.buffer);
    const buffer = await this.s3Service.getBuffer(content.id);
    const pdf = await this.ocr.overlayPdf(buffer, content.blocks);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="ocr.pdf"',
    });
    res.send(Buffer.from(pdf));
  }

  @Post('raw')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50_000_000 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload a single file for raw text extraction',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          nullable: false,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Extracted raw text from the uploaded file',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
            },
          },
        },
      },
    },
  })
  async syncRaw(@UploadedFile() file: Express.Multer.File) {
    const content = await this.job.processSync(file.buffer);
    return { text: this.ocr.extractRaw(content.blocks) };
  }
}
