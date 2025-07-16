import { Injectable } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { $bool, $int, $str } from 'src/config.helper';

if (process.env.NO_DOTENV !== 'true') {
  dotenv.config();
  process.env.NO_DOTENV = 'true';
}

@Injectable()
export class CfgService {
  /** @hidden */
  constructor() {}

  readonly redisEnabled = $bool('REDIS_ENABLED', false);
  readonly redisHost = $str('REDIS_HOST', 'localhost');
  readonly redisPort = $int('REDIS_PORT', 6379);

  readonly awsRegion = $str('AWS_REGION', 'us-east-1');
  readonly s3Bucket = $str('S3_BUCKET', 'my-ocr-bucket');
  readonly awsAccessKeyId = $str('AWS_ACCESS_KEY_ID');
  readonly awsSecretAccessKey = $str('AWS_SECRET_ACCESS_KEY');

  readonly asyncCacheTtl = $int('ASYNC_CACHE_TTL', 600);
  readonly fontPath = $str('FONT_PATH', './noto-sans.ttf');
}
