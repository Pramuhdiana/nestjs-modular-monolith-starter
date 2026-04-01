import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Logger as PinoLogger } from 'nestjs-pino';
import * as request from 'supertest';
import { applyHttpGlobals } from '../src/app.http-global';
import { AppModule } from '../src/app.module';

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(PinoLogger));
    applyHttpGlobals(app);
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health — envelope + rate-limit exclusion', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(res.body).toMatchObject({
      data: { status: 'ok', service: 'modular-monolith-internal' },
      meta: expect.objectContaining({
        at: expect.any(String),
        requestId: expect.anything(),
      }),
    });
  });
});
