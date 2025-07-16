import {
  Controller,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiCreatedResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PDFDocument } from 'pdf-lib';

@Controller('convert')
export class ConvertController {
  @Post()
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
    const pdf = await PDFDocument.create();
    const image = await (file.mimetype === 'image/png'
      ? pdf.embedPng(file.buffer)
      : pdf.embedJpg(file.buffer));
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
    const pdfBytes = await pdf.save();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="converted.pdf"',
    });
    const buffer = Buffer.from(pdfBytes);
    res.send(buffer);
  }
}
