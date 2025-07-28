import { Injectable } from '@nestjs/common';
import { CfgService } from './cfg.service';

export interface RasterCacheValue {
  raster: Buffer;
  widthBytes: number;
  height: number;
}

@Injectable()
export class CacheService {
  constructor(private readonly cfg: CfgService) {}

  private readonly imageRasterCache = new Map<string, RasterCacheValue>();
  private readonly htmlPngCache = new Map<string, Buffer>();

  getImageRaster(key: string): RasterCacheValue | undefined {
    const v = this.imageRasterCache.get(key);
    if (!v) return undefined;
    this.imageRasterCache.delete(key);
    this.imageRasterCache.set(key, v);
    return v;
  }

  setImageRaster(key: string, value: RasterCacheValue): void {
    this.imageRasterCache.set(key, value);
    this.enforceMax(this.imageRasterCache, this.cfg.printImageRasterCacheMax);
  }

  getHtmlPng(key: string): Buffer | undefined {
    const v = this.htmlPngCache.get(key);
    if (!v) return undefined;
    this.htmlPngCache.delete(key);
    this.htmlPngCache.set(key, v);
    return v;
  }

  setHtmlPng(key: string, value: Buffer): void {
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
