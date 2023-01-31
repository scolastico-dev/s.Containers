import {Controller, Get} from '@nestjs/common';
import { OtpService } from '../services/otp.service';

@Controller()
export class GetController {
  constructor(private readonly otp: OtpService) {}

  @Get()
  getHello(): any {
    return {otp: this.otp.getOTP()}
  }
}
