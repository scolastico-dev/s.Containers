import { Injectable } from '@nestjs/common';
import { $bool, $int, $str } from '@scolastico-dev/env-helper';
import * as dotenv from 'dotenv';

if (!$bool('NO_DOTENV', false)) dotenv.config();

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
  readonly drawBoundingBox = $bool('DRAW_BOUNDING_BOX', false);
  readonly pngQuality = $int('PNG_QUALITY', 2);

  readonly basicAuthUsername = $str('BASIC_AUTH_USERNAME', '');
  readonly basicAuthPassword = $str('BASIC_AUTH_PASSWORD', '');
}
