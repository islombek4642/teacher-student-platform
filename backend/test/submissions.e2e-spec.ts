import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { QuestionType, Role } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

describe('Submissions (e2e)', () => {
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

  it('auto-grades a submission and rejects a second attempt on the same task', async () => {
    const passwordHash = await hashPassword('0000');
    const teacherUser = await prisma.user.create({ data: { username: 't1', passwordHash, role: Role.TEACHER } });
    const teacherProfile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, firstName: 'T', lastName: '1' },
    });
    const group = await prisma.group.create({ data: { name: '9-A', teacherId: teacherProfile.id } });
    const subject = await prisma.subject.findUniqueOrThrow({ where: { code: 'ENGLISH' } });
    const task = await prisma.task.create({
      data: {
        title: 'Present Simple',
        subjectId: subject.id,
        groupId: group.id,
        teacherId: teacherProfile.id,
        questions: { create: [{ type: QuestionType.FILL_BLANK, text: 'He ___ to school.', correctAnswer: 'goes' }] },
      },
      include: { questions: true },
    });
    const studentUser = await prisma.user.create({ data: { username: 's1', passwordHash, role: Role.STUDENT } });
    const studentProfile = await prisma.studentProfile.create({
      data: { userId: studentUser.id, firstName: 'S', lastName: '1', groupId: group.id },
    });
    const studentToken = jwtService.sign({
      sub: studentUser.id,
      role: Role.STUDENT,
      profileId: studentProfile.id,
    });

    const submitResponse = await request(app.getHttpServer())
      .post(`/tasks/${task.id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionId: task.questions[0].id, answer: 'Goes' }] });

    expect(submitResponse.status).toBe(201);
    expect(submitResponse.body.score).toBe(1);

    const secondAttempt = await request(app.getHttpServer())
      .post(`/tasks/${task.id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionId: task.questions[0].id, answer: 'goes' }] });

    expect(secondAttempt.status).toBe(409);
    expect(secondAttempt.body.errorCode).toBe('ERR_SUBMISSION_ALREADY_COMPLETED');
  });

  it('does not inflate score when the same correct questionId is repeated in one request', async () => {
    const passwordHash = await hashPassword('0000');
    const teacherUser = await prisma.user.create({ data: { username: 't2', passwordHash, role: Role.TEACHER } });
    const teacherProfile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, firstName: 'T', lastName: '2' },
    });
    const group = await prisma.group.create({ data: { name: '9-B', teacherId: teacherProfile.id } });
    const subject = await prisma.subject.findUniqueOrThrow({ where: { code: 'ENGLISH' } });
    const task = await prisma.task.create({
      data: {
        title: 'Present Simple',
        subjectId: subject.id,
        groupId: group.id,
        teacherId: teacherProfile.id,
        questions: { create: [{ type: QuestionType.FILL_BLANK, text: 'He ___ to school.', correctAnswer: 'goes' }] },
      },
      include: { questions: true },
    });
    const studentUser = await prisma.user.create({ data: { username: 's2', passwordHash, role: Role.STUDENT } });
    const studentProfile = await prisma.studentProfile.create({
      data: { userId: studentUser.id, firstName: 'S', lastName: '2', groupId: group.id },
    });
    const studentToken = jwtService.sign({
      sub: studentUser.id,
      role: Role.STUDENT,
      profileId: studentProfile.id,
    });

    const submitResponse = await request(app.getHttpServer())
      .post(`/tasks/${task.id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        answers: [
          { questionId: task.questions[0].id, answer: 'goes' },
          { questionId: task.questions[0].id, answer: 'goes' },
          { questionId: task.questions[0].id, answer: 'goes' },
        ],
      });

    expect(submitResponse.status).toBe(201);
    expect(submitResponse.body.score).toBe(1);
  });
});
