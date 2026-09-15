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

async function createTeacherWithGroup(prisma: PrismaService, username: string, groupName: string) {
  const passwordHash = await hashPassword('0000');
  const user = await prisma.user.create({ data: { username, passwordHash, role: Role.TEACHER } });
  const profile = await prisma.teacherProfile.create({
    data: { userId: user.id, firstName: 'T', lastName: username },
  });
  const group = await prisma.group.create({ data: { name: groupName, teacherId: profile.id } });
  return { user, profile, group };
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

  it('lets the owning teacher rename their group', async () => {
    const teacher = await createTeacherWithGroup(prisma, 'teacherRename', '9-A');
    const token = jwtService.sign({ sub: teacher.user.id, role: Role.TEACHER, profileId: teacher.profile.id });

    const response = await request(app.getHttpServer())
      .patch(`/groups/${teacher.group.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '9-A Renamed' });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('9-A Renamed');
  });

  it('lets the owning teacher delete an empty group', async () => {
    const teacher = await createTeacherWithGroup(prisma, 'teacherDelete', '9-A');
    const token = jwtService.sign({ sub: teacher.user.id, role: Role.TEACHER, profileId: teacher.profile.id });

    const response = await request(app.getHttpServer())
      .delete(`/groups/${teacher.group.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(204);

    const group = await prisma.group.findUnique({ where: { id: teacher.group.id } });
    expect(group).toBeNull();
  });

  it('rejects deleting a group that still has a student in it', async () => {
    const teacher = await createTeacherWithGroup(prisma, 'teacherBlocked', '9-A');
    const token = jwtService.sign({ sub: teacher.user.id, role: Role.TEACHER, profileId: teacher.profile.id });

    const studentPasswordHash = await hashPassword('0000');
    const studentUser = await prisma.user.create({
      data: { username: 'student.blocker', passwordHash: studentPasswordHash, role: Role.STUDENT },
    });
    await prisma.studentProfile.create({
      data: { userId: studentUser.id, firstName: 'S', lastName: 'Blocker', groupId: teacher.group.id },
    });

    const response = await request(app.getHttpServer())
      .delete(`/groups/${teacher.group.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(409);
    expect(response.body.errorCode).toBe('ERR_GROUP_HAS_DEPENDENTS');
  });
});
