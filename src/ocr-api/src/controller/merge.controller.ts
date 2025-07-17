import {
  Controller,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBasicAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from 'src/auth.guard';
import { PdfService } from 'src/services/pdf.service';

@Controller('merge')
export class MergeController {
  constructor(private readonly pdf: PdfService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBasicAuth()
  @UseInterceptors(
    FilesInterceptor('files', 1000, { limits: { fileSize: 50_000_000 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload multiple pdf or image files to merge',
    required: true,
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Merged PDF file created from the uploaded files',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async doConvert(
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="merged.pdf"',
    });
    res.send(await this.pdf.mergeFiles(files));
  }
}
