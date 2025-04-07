import {Controller, HttpException, Logger, Param, Post, Req, UploadedFile, UseInterceptors} from '@nestjs/common';
import { OtpService } from '../services/otp.service';
import {ProcessorService} from "../services/processor.service";
import {FileInterceptor} from "@nestjs/platform-express";
import {Express} from "express";
import {ConfigService} from "@nestjs/config";
import {LocationConfig} from "../configuration";

@Controller()
export class PostController {

  private log = new Logger(this.constructor.name);

  constructor(
    private readonly otp: OtpService,
    private readonly processor: ProcessorService,
    private readonly config: ConfigService,
  ) {}

  @Post(':name/:key')
  @UseInterceptors(FileInterceptor('zip', { limits: { fileSize: 500 * 1024 * 1024 } }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Param() params, @Req() req): Promise<any> {
    const cfg = this.config.get<LocationConfig[]>("locations");
    const location = cfg.find((l) => l.name.toLowerCase() === params.name.toLowerCase());
    if (!location) throw new HttpException({error: "Location not found"}, 404);
    this.log.log(`Got request for location '${location.name}' from ${req.ip} (${req.hostname})`)
    switch (location.key.type) {
      case 'key':
        if (location.key.secret !== params.key) throw new HttpException({error: "Invalid key"}, 403);
        break;
      case 'md5':
        if (!this.otp.checkOTP(location.key.secret, params.key)) throw new HttpException({error: "Invalid key"}, 403);
        break;
    }
    this.log.log(`Processing file '${file.originalname}' for location '${location.name}' from ${req.ip} (${req.hostname})`);
    await this.processor.process(file, location);
    this.log.log(`Finished processing file '${file.originalname}' for location '${location.name}' from ${req.ip} (${req.hostname})`);
    return {success: !0};
  }
}
