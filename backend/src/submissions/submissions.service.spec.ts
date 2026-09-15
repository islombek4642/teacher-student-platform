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
          Promise.resolve({ id: 'submission-1', score: data.score, status: data.status }),
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
