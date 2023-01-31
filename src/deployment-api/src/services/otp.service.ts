import { Injectable } from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';
import * as crypto from "crypto";
import {ConfigService} from "@nestjs/config";

@Injectable()
export class OtpService {
  private currentOTP: string = '';
  private lastOTP: string = '';

  constructor(private readonly config: ConfigService) {
    this.regenerateOTP();
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  regenerateOTP() {
    this.lastOTP = this.currentOTP;
    this.currentOTP = crypto.randomBytes(16).toString('hex');
  }

  public checkOTP(secret: string, hash: string): boolean {
    const iterations = this.config.get<number>('md5Iterations');
    let hashes = [
      this.currentOTP + secret,
      this.lastOTP + secret
    ].map((otp) => {
      for (let i = 0; i < iterations; i++) {
        otp = crypto.createHash('md5').update(otp).digest('hex');
      }
      return otp;
    });
    return hashes.includes(hash);
  }

  public getOTP(): string {
    return this.currentOTP;
  }
}
