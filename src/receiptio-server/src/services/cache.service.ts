import { Injectable } from '@nestjs/common';
import { CfgService } from './cfg.service';
import { IdLogger } from 'src/id.logger';
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  rmSync,
  utimesSync,
} from 'fs';
import { join } from 'path';
import { Cron } from '@nestjs/schedule';

export interface RasterCacheValue {
  raster: Buffer;
  widthBytes: number;
  height: number;
}

@Injectable()
export class CacheService {
  constructor(
    private readonly cfg: CfgService,
    private readonly logger: IdLogger,
  ) {
    logger.setContext(CacheService.name);
  }

  private readonly imageRasterCache = new Map<string, RasterCacheValue>();
  private readonly htmlPngCache = new Map<string, Buffer>();

  @Cron('* * * * *')
  handleCron() {
    if (!this.cfg.staticCacheEnabled) return;
    for (const file of readdirSync(this.cfg.staticCacheDir)) {
      const filePath = join(this.cfg.staticCacheDir, file);
      const stats = statSync(filePath);
      if (
        stats.isFile() &&
        stats.mtimeMs < Date.now() - this.cfg.staticCacheLifetime * 1000
      ) {
        this.logger.log(`Removing expired cache file: ${filePath}`);
        try {
          rmSync(filePath);
        } catch (error) {
          this.logger.error(
            `Failed to remove cache file ${filePath}: ${error.message}`,
          );
        }
      }
    }
  }

  private getFromFile<T>(filePath: string): T | undefined {
    try {
      const fullPath = join(this.cfg.staticCacheDir, filePath);
      const data = readFileSync(fullPath, 'utf-8');
      utimesSync(fullPath, new Date(), new Date());
      return Buffer.from(data, 'base64') as T;
    } catch (error) {
      this.logger.error(
        `Failed to read from file ${filePath}: ${error.message}`,
      );
      return undefined;
    }
  }

  private setToFile<T>(filePath: string, value: T): void {
    try {
      writeFileSync(
        join(this.cfg.staticCacheDir, filePath),
        Buffer.from(value as Buffer).toString('base64'),
        'utf-8',
      );
    } catch (error) {
      this.logger.error(
        `Failed to write to file ${filePath}: ${error.message}`,
      );
    }
  }

  getImageRaster(key: string): RasterCacheValue | undefined {
    if (this.cfg.staticCacheEnabled)
      return this.getFromFile<RasterCacheValue>(key);
    const v = this.imageRasterCache.get(key);
    if (!v) return undefined;
    this.logger.debug(`Hit in image raster cache for key: ${key}`);
    this.imageRasterCache.delete(key);
    this.imageRasterCache.set(key, v);
    return v;
  }

  setImageRaster(key: string, value: RasterCacheValue): void {
    if (this.cfg.staticCacheEnabled) {
      this.setToFile<RasterCacheValue>(key, value);
      return;
    }
    this.imageRasterCache.set(key, value);
    this.enforceMax(this.imageRasterCache, this.cfg.printImageRasterCacheMax);
  }

  getHtmlPng(key: string): Buffer | undefined {
    if (this.cfg.staticCacheEnabled) return this.getFromFile<Buffer>(key);
    const v = this.htmlPngCache.get(key);
    if (!v) return undefined;
    this.logger.debug(`Hit in HTML PNG cache for key: ${key}`);
    this.htmlPngCache.delete(key);
    this.htmlPngCache.set(key, v);
    return v;
  }

  setHtmlPng(key: string, value: Buffer): void {
    if (this.cfg.staticCacheEnabled) {
      this.setToFile<Buffer>(key, value);
      return;
    }
    this.htmlPngCache.set(key, value);
    this.enforceMax(this.htmlPngCache, this.cfg.printHtmlPngCacheMax);
  }

  private enforceMax<T>(map: Map<string, T>, max: number) {
    if (max <= 0) {
      map.clear();
      return;
    }
    while (map.size > max) {
      const oldestKey = map.keys().next().value as string;
      map.delete(oldestKey);
    }
  }
}
