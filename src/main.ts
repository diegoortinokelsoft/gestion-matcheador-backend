import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService<Env, true>);
  const port = configService.get('PORT', { infer: true });
  const allowedOrigins = configService.get('ALLOWED_ORIGINS', { infer: true });

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(port);
}
bootstrap();
