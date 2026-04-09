import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: true, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('LeX Finance API')
    .setDescription('Controle financeiro pessoal e empresarial')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const publicPath = join(__dirname, '..', 'public');
  app.use(express.static(publicPath));
  const indexHtml = join(publicPath, 'index.html');
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    if (req.method !== 'GET') {
      return next();
    }
    if (req.originalUrl.split('/').pop()?.includes('.')) {
      return next();
    }
    res.sendFile(indexHtml, (err: Error | null) => {
      if (err) next();
    });
  });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`LeX API em http://0.0.0.0:${port} (docs: /api/docs)`);
}

bootstrap();
