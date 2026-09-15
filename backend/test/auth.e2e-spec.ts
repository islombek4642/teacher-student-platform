import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

describe('POST /auth/login (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns an access token for valid credentials', async () => {
    const passwordHash = await hashPassword('1234');
    await prisma.user.create({
      data: { username: 'teacher1', passwordHash, role: Role.TEACHER },
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'teacher1', password: '1234' });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects invalid credentials with ERR_INVALID_CREDENTIALS', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'nobody', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body.errorCode).toBe('ERR_INVALID_CREDENTIALS');
  });

  it('rejects an invalid body with ERR_VALIDATION_FAILED', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({});

    expect(response.status).toBe(400);
    expect(response.body.errorCode).toBe('ERR_VALIDATION_FAILED');
  });
});
