import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';
import { JwtService } from '@nestjs/jwt';

describe('Teachers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    jwtService = app.get(JwtService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets a SUPER_ADMIN create a teacher and returns a one-time password', async () => {
    const passwordHash = await hashPassword('0000');
    const admin = await prisma.user.create({
      data: { username: 'admin1', passwordHash, role: Role.SUPER_ADMIN },
    });
    const token = jwtService.sign({ sub: admin.id, role: Role.SUPER_ADMIN, profileId: null });

    const response = await request(app.getHttpServer())
      .post('/teachers')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'teacher.ali', firstName: 'Ali', lastName: 'Vali' });

    expect(response.status).toBe(201);
    expect(response.body.temporaryPassword).toMatch(/^\d{4}$/);
  });

  it('rejects a TEACHER trying to create another teacher', async () => {
    const passwordHash = await hashPassword('0000');
    const teacherUser = await prisma.user.create({
      data: { username: 'teacher0', passwordHash, role: Role.TEACHER },
    });
    const profile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, firstName: 'A', lastName: 'B' },
    });
    const token = jwtService.sign({ sub: teacherUser.id, role: Role.TEACHER, profileId: profile.id });

    const response = await request(app.getHttpServer())
      .post('/teachers')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'teacher.ali', firstName: 'Ali', lastName: 'Vali' });

    expect(response.status).toBe(403);
  });

  it('rejects creating a teacher with a username that is already taken', async () => {
    const passwordHash = await hashPassword('0000');
    const admin = await prisma.user.create({
      data: { username: 'admin-dup-teacher', passwordHash, role: Role.SUPER_ADMIN },
    });
    const token = jwtService.sign({ sub: admin.id, role: Role.SUPER_ADMIN, profileId: null });

    const first = await request(app.getHttpServer())
      .post('/teachers')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'teacher.dup', firstName: 'Ali', lastName: 'Vali' });
    expect(first.status).toBe(201);

    const second = await request(app.getHttpServer())
      .post('/teachers')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'teacher.dup', firstName: 'Boris', lastName: 'Ivanov' });

    expect(second.status).toBe(409);
    expect(second.body.errorCode).toBe('ERR_USERNAME_TAKEN');
  });
});
