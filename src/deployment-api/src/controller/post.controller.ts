import {Controller, HttpException, Param, Post, UploadedFile, UseInterceptors} from '@nestjs/common';
import { OtpService } from '../services/otp.service';
import {ProcessorService} from "../services/processor.service";
import {FileInterceptor} from "@nestjs/platform-express";
import {Express} from "express";
import {ConfigService} from "@nestjs/config";
import {LocationConfig} from "../configuration";

@Controller()
export class PostController {
  constructor(
    private readonly otp: OtpService,
    private readonly processor: ProcessorService,
    private readonly config: ConfigService,
  ) {}

  @Post(':name/:key')
  @UseInterceptors(FileInterceptor('zip'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Param() params): Promise<any> {
    const cfg = this.config.get<LocationConfig[]>("locations");
    const location = cfg.find((l) => l.name.toLowerCase() === params.name.toLowerCase());
    if (!location) throw new HttpException({error: "Location not found"}, 404);
    switch (location.key.type) {
      case 'key':
        if (location.key.secret !== params.key) throw new HttpException({error: "Invalid key"}, 403);
        break;
      case 'md5':
        if (!this.otp.checkOTP(location.key.secret, params.key)) throw new HttpException({error: "Invalid key"}, 403);
        break;
    }
    await this.processor.process(file, location);
    return {success: !0};
  }
}
