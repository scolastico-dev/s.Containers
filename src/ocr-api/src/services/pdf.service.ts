import { HttpException, Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import {
  beginText,
  endText,
  PDFDocument,
  PDFOperator,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setFontAndSize,
  setTextMatrix,
  setTextRenderingMode,
  showText,
} from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import { Block } from '@aws-sdk/client-textract';
import { CfgService } from './cfg.service';
import { pdfToPng } from 'pdf-to-png-converter';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  constructor(private cfg: CfgService) {}

  async overlayPdf(
    buffer: Buffer,
    blocks: Block[],
  ): Promise<Uint8Array | ArrayBufferLike> {
    const pdfDoc = await PDFDocument.load(buffer);
    pdfDoc.registerFontkit(fontkit);
    const fontBytes = readFileSync(this.cfg.fontPath);
    const font = await pdfDoc.embedFont(fontBytes);
    const pages = pdfDoc.getPages();

    pages.forEach((page, idx) => {
      const { width, height } = page.getSize();
      const pageBlocks = blocks.filter(
        (b) => b.BlockType === 'WORD' && b.Page === idx + 1,
      );
      pageBlocks.forEach((b) => {
        const {
          Text: word,
          Geometry: { BoundingBox: box },
        } = b;
        const x = box.Left * width;
        const y = (1 - box.Top) * height - box.Height * height;
        const size = box.Height * height;
        const defaultWidth = font.widthOfTextAtSize(word || '', size);
        const scale = (box.Width * width) / defaultWidth;
        const { newFontKey } = (page as any).setOrEmbedFont(font); // Accessing private method
        page.pushOperators(
          pushGraphicsState(),
          beginText(),
          setTextRenderingMode(3),
          setFontAndSize(newFontKey, size),
          PDFOperator.of('Tz' as any, [(scale * 100).toFixed(2).toString()]),
          setTextMatrix(1, 0, 0, 1, x, y),
          showText(font.encodeText(word || '')),
          endText(),
          popGraphicsState(),
        );
        if (this.cfg.drawBoundingBox)
          page.drawRectangle({
            width: box.Width * width,
            height: box.Height * height,
            x,
            y,
            borderColor: rgb(1, 0, 0),
            borderWidth: 1,
            color: rgb(0, 0, 0),
            opacity: 0,
          });
      });
    });
    this.logger.log(`Overlayed PDF with ${blocks.length} blocks`);
    return await pdfDoc.save();
  }

  async imageToPdf(buffer: Buffer, mimetype: string): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    let image;
    if (mimetype === 'image/png') {
      image = await pdf.embedPng(buffer);
    } else if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
      image = await pdf.embedJpg(buffer);
    } else {
      throw new HttpException('Unsupported image type: ' + mimetype, 400);
    }
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
    const pdfBytes = await pdf.save();
    this.logger.log(`Converted image to PDF: ${mimetype}`);
    return Buffer.from(pdfBytes);
  }

  async mergeFiles(
    files: { buffer: Buffer; mimetype: string }[],
  ): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    for (const file of files) {
      switch (file.mimetype) {
        case 'application/pdf': {
          const pdfToEmbed = await PDFDocument.load(file.buffer);
          const copiedPages = await pdf.copyPages(
            pdfToEmbed,
            pdfToEmbed.getPageIndices(),
          );
          for (const page of copiedPages) pdf.addPage(page);
          break;
        }
        case 'image/png': {
          const image = await pdf.embedPng(file.buffer);
          const page = pdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
          break;
        }
        case 'image/jpeg':
        case 'image/jpg': {
          const image = await pdf.embedJpg(file.buffer);
          const page = pdf.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
          break;
        }
        default:
          throw new HttpException(
            'Unsupported file type: ' + file.mimetype,
            400,
          );
      }
    }
    const pdfBytes = await pdf.save();
    this.logger.log(`Merged ${files.length} files into a single PDF`);
    return Buffer.from(pdfBytes);
  }

  async pdfToImageToPdf(buffer: Buffer): Promise<Buffer> {
    const images = await pdfToPng(buffer as any, {
      viewportScale: this.cfg.pngQuality,
    });
    const newPdf = await PDFDocument.create();
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const img = await newPdf.embedPng(image.content);
      const page = newPdf.addPage([image.width, image.height]);
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }
    this.logger.log(`Converted PDF to image and back to PDF`);
    return Buffer.from(await newPdf.save());
  }
}
