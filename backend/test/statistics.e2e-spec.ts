import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { QuestionType, Role, SubmissionStatus } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

describe('Statistics (e2e)', () => {
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

  it('returns a leaderboard scoped to the caller own group', async () => {
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
      data: { userId: studentUser.id, firstName: 'Top', lastName: 'Student', groupId: group.id },
    });
    await prisma.submission.create({
      data: {
        taskId: task.id,
        studentId: studentProfile.id,
        status: SubmissionStatus.COMPLETED,
        score: 1,
        submittedAt: new Date(),
        answers: { create: [{ questionId: task.questions[0].id, studentAnswer: 'goes', isCorrect: true }] },
      },
    });

    const teacherToken = jwtService.sign({
      sub: teacherUser.id,
      role: Role.TEACHER,
      profileId: teacherProfile.id,
    });

    const response = await request(app.getHttpServer())
      .get(`/groups/${group.id}/statistics/leaderboard`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({ studentId: studentProfile.id, totalScore: 1 });
  });
});
