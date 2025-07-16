import { Injectable, Inject } from '@nestjs/common';
import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  Block,
} from '@aws-sdk/client-textract';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { CfgService } from './cfg.service';
import { readFileSync } from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';

@Injectable()
export class OcrService {
  private textractClient: TextractClient;

  constructor(
    private cfgService: CfgService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.textractClient = new TextractClient({
      region: process.env.AWS_REGION,
    });
  }

  async detectText(key: string): Promise<Block[]> {
    const start = await this.textractClient.send(
      new StartDocumentTextDetectionCommand({
        DocumentLocation: {
          S3Object: { Bucket: this.cfgService.s3Bucket, Name: key },
        },
      }),
    );
    const jobId = start.JobId;
    let nextToken: string | undefined;
    const blocks: Block[] = [];

    while (true) {
      const res = await this.textractClient.send(
        new GetDocumentTextDetectionCommand({
          JobId: jobId,
          NextToken: nextToken,
        }),
      );
      if (res.JobStatus === 'SUCCEEDED') {
        blocks.push(...(res.Blocks || []));
        if (!res.NextToken) break;
        nextToken = res.NextToken;
      } else if (res.JobStatus === 'FAILED') {
        throw new Error(`Textract job ${jobId} failed`);
      } else {
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    return blocks;
  }

  async overlayPdf(
    buffer: Buffer,
    blocks: Block[],
  ): Promise<Uint8Array<ArrayBufferLike>> {
    const pdfDoc = await PDFDocument.load(buffer);
    pdfDoc.registerFontkit(fontkit);
    const fontBytes = readFileSync(this.cfgService.fontPath);
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
        const fontSize = box.Height * height;
        page.drawText(word, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          opacity: 0,
        });
      });
    });

    return await pdfDoc.save();
  }

  extractRaw(blocks: Block[]): string {
    return blocks
      .filter((b) => b.BlockType === 'WORD')
      .map((b) => b.Text)
      .join(' ');
  }
}
