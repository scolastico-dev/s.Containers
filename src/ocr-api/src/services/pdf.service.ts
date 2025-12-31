import { HttpException, Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import {
  beginText,
  endText,
  PageSizes,
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
          Geometry: { BoundingBox: box, Polygon: polygon },
        } = b;
        const { newFontKey } = (page as any).setOrEmbedFont(font); // Accessing private method
        const p0 = polygon[0];
        const p1 = polygon[1];
        const run = (p1.X - p0.X) * width;
        const rise = (p1.Y - p0.Y) * height; // Y is inverted in PDF space calculation usually, but Textract is 0-1.
        // Note: In PDF, Y grows upwards. In Textract, Y grows downwards.
        // We usually invert Y for calculation or handle it in the matrix.
        // For simplicity, let's just get the geometric angle on the page surface.
        const angle = Math.atan2(rise, run);

        // 2. Calculate "True" Height (Font Size) and Width
        // Distance between Point 0 and Point 3 is the height (roughly)
        const p3 = polygon[3];
        const h_dx = (p3.X - p0.X) * width;
        const h_dy = (p3.Y - p0.Y) * height;
        const trueHeight = Math.sqrt(h_dx * h_dx + h_dy * h_dy);

        // Distance between Point 0 and Point 1 is the width
        const trueWidth = Math.sqrt(run * run + rise * rise);

        // 3. Coordinate calculation (Start at Point 3 - Bottom Left of the text for PDF standard usually,
        // or Point 0 Top-Left depending on how you want to anchor. Textract is Top-Left based.
        // pdf-lib drawText usually expects bottom-left baseline.
        // Let's stick to the box logic but rotated)
        // Using Point 3 (Bottom-Left in text orientation) as anchor for PDF baseline is often safest.
        const x = p3.X * width;
        const y = (1 - p3.Y) * height; // Invert Y for PDF coordinates

        const defaultWidth = font.widthOfTextAtSize(word || '', trueHeight);
        const scale = trueWidth / defaultWidth;

        // 4. Calculate Rotation Matrix components
        // PDF rotation is counter-clockwise. Textract angle might need sign flip depending on Y-axis logic.
        // A standard rotation matrix is [cos, sin, -sin, cos, x, y].
        // Because PDF Y-axis is up, and screen/image Y-axis is down, -angle is often needed.
        const rad = -angle;
        const c = Math.cos(rad);
        const s = Math.sin(rad);

        page.pushOperators(
          pushGraphicsState(),
          beginText(),
          setTextRenderingMode(3),
          // Use the TRUE height calculated from polygon side, not bounding box height
          setFontAndSize(newFontKey, trueHeight),
          PDFOperator.of('Tz' as any, [(scale * 100).toFixed(2).toString()]),
          // Apply rotation matrix
          setTextMatrix(c, s, -s, c, x, y),
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

  async addTextPages(
    buffer: Buffer,
    text: string,
    format: string = 'A4',
    suffix: boolean = true,
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(buffer);
    pdfDoc.registerFontkit(fontkit);
    const fontBytes = readFileSync(this.cfg.fontPath);
    const font = await pdfDoc.embedFont(fontBytes);

    const fontSize = 12;
    const margin = 50;
    const pageSize = PageSizes[format] || PageSizes.A4;
    const [pageWidth, pageHeight] = pageSize;
    const maxTextWidth = pageWidth - 2 * margin;
    const lineHeight = fontSize * 1.2;

    const lines = this.wrapText(text, font, fontSize, maxTextWidth);

    // Calculate how many lines fit on a page
    const maxLinesPerPage = Math.floor((pageHeight - 2 * margin) / lineHeight);

    const pagesNeeded = Math.ceil(lines.length / maxLinesPerPage);
    const createdPages: any[] = [];
    const allPages = !suffix ? pdfDoc.getPages() : [];
    if (!suffix) for (const {} of allPages) pdfDoc.removePage(0); // Temporarily remove existing pages

    for (let i = 0; i < pagesNeeded; i++) {
      const page = pdfDoc.addPage(pageSize);
      const startLine = i * maxLinesPerPage;
      const endLine = Math.min(startLine + maxLinesPerPage, lines.length);
      const pageLines = lines.slice(startLine, endLine);

      let yPosition = pageHeight - margin - fontSize;

      for (const line of pageLines) {
        page.drawText(line, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;
      }
      createdPages.push(page);
    }

    for (const p of allPages) pdfDoc.addPage(p); // Re-add existing pages at end if suffix

    this.logger.log(
      `Added ${createdPages.length} text pages to PDF (suffix: ${suffix})`,
    );
    return Buffer.from(await pdfDoc.save());
  }

  private wrapText(
    text: string,
    font: any,
    size: number,
    maxWidth: number,
  ): string[] {
    const lines: string[] = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (paragraph === '') {
        lines.push('');
        continue;
      }
      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, size);
        if (width <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }
    return lines;
  }
}
