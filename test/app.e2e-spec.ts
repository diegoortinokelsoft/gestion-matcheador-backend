import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'anon_key_for_tests';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_key_for_tests';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.APPSCRIPT_BASE_URL = 'https://example.com/apps-script';
process.env.APPSCRIPT_INTERNAL_TOKEN = 'test_internal_token_1234567890';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AppModule } = require('./../src/app.module');

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ ok: true });
  });
});
