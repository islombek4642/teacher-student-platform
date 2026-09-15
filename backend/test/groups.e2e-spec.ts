import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

async function createTeacher(prisma: PrismaService, username: string) {
  const passwordHash = await hashPassword('0000');
  const user = await prisma.user.create({ data: { username, passwordHash, role: Role.TEACHER } });
  const profile = await prisma.teacherProfile.create({
    data: { userId: user.id, firstName: 'T', lastName: username },
  });
  return { user, profile };
}

describe('Groups (e2e)', () => {
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

  it('lets a teacher create and list only their own groups', async () => {
    const teacherA = await createTeacher(prisma, 'teacherA');
    const teacherB = await createTeacher(prisma, 'teacherB');
    const tokenA = jwtService.sign({ sub: teacherA.user.id, role: Role.TEACHER, profileId: teacherA.profile.id });
    const tokenB = jwtService.sign({ sub: teacherB.user.id, role: Role.TEACHER, profileId: teacherB.profile.id });

    await request(app.getHttpServer())
      .post('/groups')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: '9-A' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/groups')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: '9-B' })
      .expect(201);

    const listA = await request(app.getHttpServer())
      .get('/groups')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(listA.body).toHaveLength(1);
    expect(listA.body[0].name).toBe('9-A');
  });
});
