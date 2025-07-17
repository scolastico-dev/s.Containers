import {
  Controller,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBasicAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from 'src/auth.guard';
import { PdfService } from 'src/services/pdf.service';

@Controller('convert')
export class ConvertController {
  constructor(private readonly pdf: PdfService) {}

  @Post()
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
  async doConvert(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="converted.pdf"',
    });
    res.send(await this.pdf.imageToPdf(file.buffer, file.mimetype));
  }
}
