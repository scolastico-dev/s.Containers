import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  Res,
  HttpException,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from '../services/ocr.service';
import { Response } from 'express';
import {
  ApiAcceptedResponse,
  ApiBasicAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { JobService } from 'src/services/job.service';
import { S3Service } from 'src/services/s3.service';
import { PdfService } from 'src/services/pdf.service';
import { AuthGuard } from 'src/auth.guard';

@Controller('async')
export class AsyncController {
  constructor(
    private readonly job: JobService,
    private readonly ocr: OcrService,
    private readonly pdf: PdfService,
    private readonly s3: S3Service,
  ) {}

  @Post('start')
  @UseGuards(AuthGuard)
  @ApiBasicAuth()
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
    description: 'Job started successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Job ID for tracking the async process',
            },
          },
        },
      },
    },
  })
  async asyncStart(@UploadedFile() file: Express.Multer.File) {
    const id = await this.job.startAsync(file.buffer);
    return { id };
  }

  @Get(':id/raw')
  @UseGuards(AuthGuard)
  @ApiBasicAuth()
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
  @ApiAcceptedResponse({
    description: 'Job is still processing',
  })
  @ApiNotFoundResponse({
    description: 'Job not found or expired',
  })
  async asyncRaw(@Param('id') id: string) {
    const result = await this.job.getAsync(id);
    if (result === null)
      throw new HttpException('Not found or expired', HttpStatus.NOT_FOUND);
    if (result === false)
      throw new HttpException('Job is still processing', HttpStatus.ACCEPTED);
    return { text: this.ocr.extractRaw(result.blocks) };
  }

  @Get(':id/file')
  @UseGuards(AuthGuard)
  @ApiBasicAuth()
  @ApiCreatedResponse({
    description: 'PDF file created from the uploaded image',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiAcceptedResponse({
    description: 'Job is still processing',
  })
  @ApiNotFoundResponse({
    description: 'Job not found or expired',
  })
  async asyncFile(@Param('id') id: string, @Res() res: Response) {
    const result = await this.job.getAsync(id);
    if (result === null)
      throw new HttpException('Not found or expired', HttpStatus.NOT_FOUND);
    if (result === false)
      throw new HttpException('Job is still processing', HttpStatus.ACCEPTED);
    const pdf = await this.s3.getBuffer(id);
    const out = await this.pdf.overlayPdf(pdf, result.blocks);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="ocr.pdf"',
    });
    res.send(Buffer.from(out));
  }
}
