import { Injectable } from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';
import * as crypto from "crypto";
import {ConfigService} from "@nestjs/config";

@Injectable()
export class OtpService {
  private currentOTP: string = '';
  private lastOTP: string = '';
  private hashCache: {
    [key: string]: {
      current: string,
      last: string
    }
  } = {};

  constructor(private readonly config: ConfigService) {
    this.regenerateOTP();
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  regenerateOTP() {
    this.lastOTP = this.currentOTP;
    for (let key in this.hashCache) {
      this.hashCache[key].last = this.hashCache[key].current;
      if (this.hashCache[key].last === '') {
        delete this.hashCache[key];
      } else this.hashCache[key].current = '';
    }
    this.currentOTP = crypto.randomBytes(16).toString('hex');
  }

  public getHash(secret: string): {current: string, last: string} {
    let cache = this.hashCache[secret];
    if (!cache) cache = {last: '', current: ''};
    if (cache.current !== '') return cache;
    const iterations = this.config.get<number>('md5Iterations');
    const obj = {
      current: this.currentOTP + secret,
      last: cache.last ? cache.last : this.lastOTP + secret
    }
    for (let i = 0; i < iterations; i++) for (const key of Object.keys(obj)) {
      const md5 = crypto.createHash('md5');
      obj[key] = md5.update(obj[key]).digest('hex');
    }
    return this.hashCache[secret] = obj;
  }

  public checkOTP(secret: string, hash: string): boolean {
    const hashes = this.getHash(secret);
    return Object.values(hashes).includes(hash);
  }

  public getOTP(): string {
    return this.currentOTP;
  }
}
