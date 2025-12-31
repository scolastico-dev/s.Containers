import {
  Body,
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
  ApiProperty,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from 'src/auth.guard';
import { PdfService } from 'src/services/pdf.service';

class TextDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;

  @ApiProperty({ description: 'The text to add to the PDF' })
  text: string;

  @ApiProperty({
    description: 'Page format (e.g., A4, Letter)',
    default: 'A4',
    required: false,
  })
  format?: string;

  @ApiProperty({
    description: 'Add pages at end (true) or start (false)',
    default: true,
    required: false,
  })
  suffix?: string; // Multipart/form-data often sends booleans as strings
}

@Controller('text')
export class TextController {
  constructor(private readonly pdf: PdfService) {}

  @Post('add')
  @UseGuards(AuthGuard)
  @ApiBasicAuth()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50_000_000 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload a PDF and add text pages to it',
    type: TextDto,
  })
  @ApiCreatedResponse({
    description: 'PDF file with added text pages',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async addText(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: TextDto,
    @Res() res: Response,
  ) {
    const suffix = body.suffix !== 'false'; // Default to true if not "false" string
    const format = body.format || 'A4';

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="modified.pdf"',
    });
    res.send(
      await this.pdf.addTextPages(file.buffer, body.text, format, suffix),
    );
  }
}
