import { Module } from '@nestjs/common';
import { GetController } from './controller/get.controller';
import { PostController } from './controller/post.controller';
import { OtpService } from './services/otp.service';
import { ProcessorService } from './services/processor.service';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [GetController, PostController],
  providers: [OtpService, ProcessorService],
})
export class AppModule {}
