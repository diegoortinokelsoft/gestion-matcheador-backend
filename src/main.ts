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

  // IMPORTANT behind Railway proxy
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

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
  const rawAllowed = configService.get('ALLOWED_ORIGINS', { infer: true });

  const allowedList = Array.isArray(rawAllowed)
    ? rawAllowed
    : String(rawAllowed)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedList.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });

  app.use(helmet());
  app.use(createCsrfMiddleware({ allowedOrigins: allowedList }));

  await app.listen(port || 3000, '0.0.0.0');
}
bootstrap();
