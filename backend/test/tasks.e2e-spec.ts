import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { QuestionType, Role } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

describe('Tasks (e2e)', () => {
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

  it('lets a teacher create a task and hides correctAnswer from the student view', async () => {
    const passwordHash = await hashPassword('0000');
    const teacherUser = await prisma.user.create({ data: { username: 't1', passwordHash, role: Role.TEACHER } });
    const teacherProfile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, firstName: 'T', lastName: '1' },
    });
    const group = await prisma.group.create({ data: { name: '9-A', teacherId: teacherProfile.id } });
    const studentUser = await prisma.user.create({ data: { username: 's1', passwordHash, role: Role.STUDENT } });
    const studentProfile = await prisma.studentProfile.create({
      data: { userId: studentUser.id, firstName: 'S', lastName: '1', groupId: group.id },
    });

    const teacherToken = jwtService.sign({
      sub: teacherUser.id,
      role: Role.TEACHER,
      profileId: teacherProfile.id,
    });

    const createResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        subjectCode: 'ENGLISH',
        groupId: group.id,
        title: 'Present Simple',
        questions: [
          { type: QuestionType.FILL_BLANK, text: 'He ___ to school.', correctAnswer: 'goes' },
        ],
      });
    expect(createResponse.status).toBe(201);

    const studentToken = jwtService.sign({
      sub: studentUser.id,
      role: Role.STUDENT,
      profileId: studentProfile.id,
    });

    const assignedResponse = await request(app.getHttpServer())
      .get('/tasks/assigned')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(assignedResponse.status).toBe(200);
    expect(assignedResponse.body[0].questions[0].correctAnswer).toBeUndefined();
  });

  it('rejects a MULTIPLE_CHOICE question whose options do not include the correct answer', async () => {
    const passwordHash = await hashPassword('0000');
    const teacherUser = await prisma.user.create({ data: { username: 't2', passwordHash, role: Role.TEACHER } });
    const teacherProfile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, firstName: 'T', lastName: '2' },
    });
    const group = await prisma.group.create({ data: { name: '9-B', teacherId: teacherProfile.id } });
    const teacherToken = jwtService.sign({
      sub: teacherUser.id,
      role: Role.TEACHER,
      profileId: teacherProfile.id,
    });

    const missingCorrectAnswer = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        subjectCode: 'ENGLISH',
        groupId: group.id,
        title: 'Grammar Quiz',
        questions: [
          {
            type: QuestionType.MULTIPLE_CHOICE,
            text: 'Pick the correct verb form.',
            options: ['go', 'goes'],
            correctAnswer: 'went',
          },
        ],
      });
    expect(missingCorrectAnswer.status).toBe(400);
    expect(missingCorrectAnswer.body.errorCode).toBe('ERR_VALIDATION_FAILED');

    const tooFewOptions = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        subjectCode: 'ENGLISH',
        groupId: group.id,
        title: 'Grammar Quiz 2',
        questions: [
          {
            type: QuestionType.MULTIPLE_CHOICE,
            text: 'Pick the correct verb form.',
            options: ['goes'],
            correctAnswer: 'goes',
          },
        ],
      });
    expect(tooFewOptions.status).toBe(400);
    expect(tooFewOptions.body.errorCode).toBe('ERR_VALIDATION_FAILED');
  });

  it('lets the owning teacher delete a task with no submissions', async () => {
    const passwordHash = await hashPassword('0000');
    const teacherUser = await prisma.user.create({ data: { username: 't3', passwordHash, role: Role.TEACHER } });
    const teacherProfile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, firstName: 'T', lastName: '3' },
    });
    const group = await prisma.group.create({ data: { name: '9-C', teacherId: teacherProfile.id } });
    const teacherToken = jwtService.sign({
      sub: teacherUser.id,
      role: Role.TEACHER,
      profileId: teacherProfile.id,
    });

    const created = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        subjectCode: 'ENGLISH',
        groupId: group.id,
        title: 'To delete',
        questions: [{ type: QuestionType.FILL_BLANK, text: 'She ___ to school.', correctAnswer: 'goes' }],
      });
    expect(created.status).toBe(201);

    const deleted = await request(app.getHttpServer())
      .delete(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(deleted.status).toBe(204);
  });

  it('rejects deleting a task that already has a submission', async () => {
    const passwordHash = await hashPassword('0000');
    const teacherUser = await prisma.user.create({ data: { username: 't4', passwordHash, role: Role.TEACHER } });
    const teacherProfile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, firstName: 'T', lastName: '4' },
    });
    const group = await prisma.group.create({ data: { name: '9-D', teacherId: teacherProfile.id } });
    const teacherToken = jwtService.sign({
      sub: teacherUser.id,
      role: Role.TEACHER,
      profileId: teacherProfile.id,
    });

    const created = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        subjectCode: 'ENGLISH',
        groupId: group.id,
        title: 'Has submission',
        questions: [{ type: QuestionType.FILL_BLANK, text: 'She ___ to school.', correctAnswer: 'goes' }],
      });
    expect(created.status).toBe(201);

    const studentUser = await prisma.user.create({ data: { username: 's4', passwordHash, role: Role.STUDENT } });
    const studentProfile = await prisma.studentProfile.create({
      data: { userId: studentUser.id, firstName: 'S', lastName: '4', groupId: group.id },
    });
    const studentToken = jwtService.sign({
      sub: studentUser.id,
      role: Role.STUDENT,
      profileId: studentProfile.id,
    });

    const submitResponse = await request(app.getHttpServer())
      .post(`/tasks/${created.body.id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionId: created.body.questions[0].id, answer: 'goes' }] });
    expect(submitResponse.status).toBe(201);

    const deleted = await request(app.getHttpServer())
      .delete(`/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(deleted.status).toBe(409);
    expect(deleted.body.errorCode).toBe('ERR_TASK_HAS_SUBMISSIONS');
  });
});
