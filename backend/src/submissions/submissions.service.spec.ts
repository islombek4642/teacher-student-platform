import { NotFoundException } from '@nestjs/common';
import { QuestionType, SubmissionStatus } from '@prisma/client';
import { SubmissionsService } from './submissions.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('SubmissionsService', () => {
  it('grades every answer and stores the total score', async () => {
    const prisma = {
      studentProfile: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'student-1', groupId: 'g1' }) },
      task: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'task-1',
          groupId: 'g1',
          questions: [
            { id: 'q1', type: QuestionType.FILL_BLANK, correctAnswer: 'goes' },
            { id: 'q2', type: QuestionType.MULTIPLE_CHOICE, correctAnswer: 'B' },
          ],
        }),
      },
      submission: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'submission-1',
            score: data.score,
            status: data.status,
            answers: data.answers.create,
          }),
        ),
      },
    } as unknown as PrismaService;
    const service = new SubmissionsService(prisma);

    const result = await service.submit('student-1', 'task-1', {
      answers: [
        { questionId: 'q1', answer: 'Goes' },
        { questionId: 'q2', answer: 'A' },
      ],
    });

    expect(result.score).toBe(1);
    expect(result.status).toBe(SubmissionStatus.COMPLETED);
    expect(result.answers).toHaveLength(2);
    expect(result.answers[0]).toMatchObject({ questionId: 'q1', isCorrect: true });
  });

  it("enriches each answer with the question's text and correct answer for review", async () => {
    const prisma = {
      studentProfile: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'student-1', groupId: 'g1' }) },
      task: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'task-1',
          groupId: 'g1',
          questions: [{ id: 'q1', type: QuestionType.FILL_BLANK, text: 'She ___ to school.', correctAnswer: 'goes' }],
        }),
      },
      submission: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'submission-1', score: data.score, status: data.status, answers: data.answers.create }),
        ),
      },
    } as unknown as PrismaService;
    const service = new SubmissionsService(prisma);

    const result = await service.submit('student-1', 'task-1', { answers: [{ questionId: 'q1', answer: 'go' }] });

    expect(result.answers[0]).toMatchObject({
      questionText: 'She ___ to school.',
      correctAnswer: 'goes',
      isCorrect: false,
    });
  });

  it('de-duplicates repeated questionIds so score cannot be inflated', async () => {
    const createMock = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ id: 'submission-1', score: data.score, status: data.status, answers: data.answers.create }),
    );
    const prisma = {
      studentProfile: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'student-1', groupId: 'g1' }) },
      task: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'task-1',
          groupId: 'g1',
          questions: [{ id: 'q1', type: QuestionType.FILL_BLANK, correctAnswer: 'goes' }],
        }),
      },
      submission: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: createMock,
      },
    } as unknown as PrismaService;
    const service = new SubmissionsService(prisma);

    const result = await service.submit('student-1', 'task-1', {
      answers: [
        { questionId: 'q1', answer: 'goes' },
        { questionId: 'q1', answer: 'goes' },
      ],
    });

    expect(result.score).toBe(1);
    const createArgs = createMock.mock.calls[0][0];
    expect(createArgs.data.answers.create).toHaveLength(1);
  });

  it('silently excludes an answer whose questionId does not belong to the task', async () => {
    const createMock = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ id: 'submission-1', score: data.score, status: data.status, answers: data.answers.create }),
    );
    const prisma = {
      studentProfile: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'student-1', groupId: 'g1' }) },
      task: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'task-1',
          groupId: 'g1',
          questions: [{ id: 'q1', type: QuestionType.FILL_BLANK, correctAnswer: 'goes' }],
        }),
      },
      submission: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: createMock,
      },
    } as unknown as PrismaService;
    const service = new SubmissionsService(prisma);

    const result = await service.submit('student-1', 'task-1', {
      answers: [{ questionId: 'not-on-task', answer: 'goes' }],
    });

    expect(result.score).toBe(0);
    const createArgs = createMock.mock.calls[0][0];
    expect(createArgs.data.answers.create).toHaveLength(0);
  });

  it('rejects submitting a task outside the student own group', async () => {
    const prisma = {
      studentProfile: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'student-1', groupId: 'g1' }) },
      task: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new SubmissionsService(prisma);

    await expect(service.submit('student-1', 'task-1', { answers: [] })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
