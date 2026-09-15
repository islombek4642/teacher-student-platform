import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { QuestionType, Role, SubmissionStatus } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

async function createTeacherWithGroup(prisma: PrismaService, username: string, groupName: string) {
  const passwordHash = await hashPassword('0000');
  const user = await prisma.user.create({ data: { username, passwordHash, role: Role.TEACHER } });
  const profile = await prisma.teacherProfile.create({
    data: { userId: user.id, firstName: 'T', lastName: username },
  });
  const group = await prisma.group.create({ data: { name: groupName, teacherId: profile.id } });
  return { user, profile, group };
}

describe('Students (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    jwtService = app.get(JwtService);
    await prisma.subject.upsert({
      where: { code: 'ENGLISH' },
      update: {},
      create: { code: 'ENGLISH', name: 'English' },
    });
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a student in the caller own group and returns a one-time password', async () => {
    const teacher = await createTeacherWithGroup(prisma, 'teacherA', '9-A');
    const token = jwtService.sign({ sub: teacher.user.id, role: Role.TEACHER, profileId: teacher.profile.id });

    const response = await request(app.getHttpServer())
      .post(`/groups/${teacher.group.id}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'student.anvar', firstName: 'Anvar', lastName: 'Qodirov' });

    expect(response.status).toBe(201);
    expect(response.body.temporaryPassword).toMatch(/^\d{4}$/);
  });

  it("rejects adding a student to another teacher's group", async () => {
    const owner = await createTeacherWithGroup(prisma, 'teacherOwner', '9-A');
    const intruder = await createTeacherWithGroup(prisma, 'teacherIntruder', '9-B');
    const intruderToken = jwtService.sign({
      sub: intruder.user.id,
      role: Role.TEACHER,
      profileId: intruder.profile.id,
    });

    const response = await request(app.getHttpServer())
      .post(`/groups/${owner.group.id}/students`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ username: 'student.anvar', firstName: 'Anvar', lastName: 'Qodirov' });

    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe('ERR_GROUP_NOT_FOUND');
  });

  it('rejects creating a student with a username that is already taken', async () => {
    const teacher = await createTeacherWithGroup(prisma, 'teacherDup', '9-C');
    const token = jwtService.sign({ sub: teacher.user.id, role: Role.TEACHER, profileId: teacher.profile.id });

    const first = await request(app.getHttpServer())
      .post(`/groups/${teacher.group.id}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'student.dup', firstName: 'Anvar', lastName: 'Qodirov' });
    expect(first.status).toBe(201);

    const second = await request(app.getHttpServer())
      .post(`/groups/${teacher.group.id}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'student.dup', firstName: 'Bek', lastName: 'Yusupov' });

    expect(second.status).toBe(409);
    expect(second.body.errorCode).toBe('ERR_USERNAME_TAKEN');
  });

  it('lets the owning teacher edit a student\'s name', async () => {
    const teacher = await createTeacherWithGroup(prisma, 'teacher-edit-student', '9-A');
    const token = jwtService.sign({ sub: teacher.user.id, role: Role.TEACHER, profileId: teacher.profile.id });
    const created = await request(app.getHttpServer())
      .post(`/groups/${teacher.group.id}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'student.edit', firstName: 'Old', lastName: 'Name' });

    const updated = await request(app.getHttpServer())
      .patch(`/students/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'New', lastName: 'Name' });

    expect(updated.status).toBe(200);
    expect(updated.body.firstName).toBe('New');
  });

  it('lets the owning teacher reset a student\'s password', async () => {
    const teacher = await createTeacherWithGroup(prisma, 'teacher-reset-pw', '9-A');
    const token = jwtService.sign({ sub: teacher.user.id, role: Role.TEACHER, profileId: teacher.profile.id });
    const created = await request(app.getHttpServer())
      .post(`/groups/${teacher.group.id}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'student.resetpw', firstName: 'A', lastName: 'B' });

    const reset = await request(app.getHttpServer())
      .post(`/students/${created.body.id}/reset-password`)
      .set('Authorization', `Bearer ${token}`);

    expect(reset.status).toBe(201);
    expect(reset.body.temporaryPassword).toMatch(/^\d{4}$/);
    expect(reset.body.temporaryPassword).not.toBe(created.body.temporaryPassword);
  });

  it('lets the owning teacher remove a student with no submissions', async () => {
    const teacher = await createTeacherWithGroup(prisma, 'teacher-remove-student', '9-A');
    const token = jwtService.sign({ sub: teacher.user.id, role: Role.TEACHER, profileId: teacher.profile.id });
    const created = await request(app.getHttpServer())
      .post(`/groups/${teacher.group.id}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'student.remove', firstName: 'A', lastName: 'B' });

    const deleted = await request(app.getHttpServer())
      .delete(`/groups/${teacher.group.id}/students/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleted.status).toBe(204);

    const list = await request(app.getHttpServer())
      .get(`/groups/${teacher.group.id}/students`)
      .set('Authorization', `Bearer ${token}`);
    expect(list.body).toEqual([]);
  });

  it('rejects removing a student that still has submissions', async () => {
    const teacher = await createTeacherWithGroup(prisma, 'teacher-remove-blocked', '9-A');
    const token = jwtService.sign({ sub: teacher.user.id, role: Role.TEACHER, profileId: teacher.profile.id });
    const subject = await prisma.subject.findUniqueOrThrow({ where: { code: 'ENGLISH' } });
    const task = await prisma.task.create({
      data: {
        title: 'Present Simple',
        subjectId: subject.id,
        groupId: teacher.group.id,
        teacherId: teacher.profile.id,
        questions: { create: [{ type: QuestionType.FILL_BLANK, text: 'He ___ to school.', correctAnswer: 'goes' }] },
      },
    });
    const created = await request(app.getHttpServer())
      .post(`/groups/${teacher.group.id}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'student.blocked', firstName: 'A', lastName: 'B' });
    await prisma.submission.create({
      data: {
        taskId: task.id,
        studentId: created.body.id,
        status: SubmissionStatus.IN_PROGRESS,
      },
    });

    const deleted = await request(app.getHttpServer())
      .delete(`/groups/${teacher.group.id}/students/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleted.status).toBe(409);
    expect(deleted.body.errorCode).toBe('ERR_STUDENT_HAS_SUBMISSIONS');
  });
});
