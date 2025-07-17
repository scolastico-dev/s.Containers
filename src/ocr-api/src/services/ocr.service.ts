import { Injectable } from '@nestjs/common';
import {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
  Block,
} from '@aws-sdk/client-textract';
import { CfgService } from './cfg.service';

@Injectable()
export class OcrService {
  private textractClient: TextractClient;

  constructor(private cfg: CfgService) {
    this.textractClient = new TextractClient({
      region: process.env.AWS_REGION,
    });
  }

  async detectText(key: string): Promise<Block[]> {
    const start = await this.textractClient.send(
      new StartDocumentTextDetectionCommand({
        DocumentLocation: {
          S3Object: { Bucket: this.cfg.s3Bucket, Name: key },
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

  extractRaw(blocks: Block[]): string {
    return blocks
      .filter((b) => b.BlockType === 'WORD')
      .map((b) => b.Text)
      .join(' ');
  }
}
