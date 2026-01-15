import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { createCsrfMiddleware } from './common/middleware/csrf.middleware';
import type { Env } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const configService = app.get(ConfigService<Env, true>);
  const port = configService.get('PORT', { infer: true });
  const allowedOrigins = configService.get('ALLOWED_ORIGINS', { infer: true });

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.use(helmet());
  app.use(createCsrfMiddleware({ allowedOrigins }));

  await app.listen(port);
}
bootstrap();
