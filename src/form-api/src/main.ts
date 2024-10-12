import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  if ((process.env.DISABLE_SWAGGER || 'false').toLowerCase() !== 'true') {
    const config = new DocumentBuilder()
      .setTitle('s.Containers/FormAPI')
      .setDescription(
        'The form api is a simple email gateway, also providing captcha validation.',
      )
      .setVersion('IN-DEV')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('', app, document);
  }

  await app.listen(3000);
}
bootstrap();
