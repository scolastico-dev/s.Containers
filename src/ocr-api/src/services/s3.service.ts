import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { CfgService } from './cfg.service';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client;

  constructor(
    private cfgService: CfgService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    this.s3Client = new S3Client({ region: this.cfgService.awsRegion });
  }

  async uploadBuffer(buffer: Buffer, key: string): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.cfgService.s3Bucket,
        Key: key,
        Body: buffer,
      }),
    );
    this.logger.log(`Uploaded buffer to S3 with key ${key}`);
  }

  async delete(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.cfgService.s3Bucket, Key: key }),
    );
    this.logger.log(`Deleted S3 object with key ${key}`);
  }

  async getBuffer(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.cfgService.s3Bucket,
      Key: key,
    });
    const response = await this.s3Client.send(command);
    this.logger.log(`Retrieved S3 object with key ${key}`);
    return Buffer.from(await response.Body.transformToByteArray());
  }
}
