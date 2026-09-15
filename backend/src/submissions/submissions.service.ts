import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { gradeAnswer } from './grading.util';
import { SubmitAnswersDto } from './dto/submit-answers.dto';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(studentProfileId: string, taskId: string, dto: SubmitAnswersDto) {
    const student = await this.prisma.studentProfile.findUniqueOrThrow({ where: { id: studentProfileId } });

    const task = await this.prisma.task.findFirst({
      where: { id: taskId, groupId: student.groupId },
      include: { questions: true },
    });
    if (!task) {
      throw new NotFoundException({ errorCode: ERROR_CODES.TASK_NOT_FOUND, message: 'Task not found' });
    }

    const existing = await this.prisma.submission.findUnique({
      where: { taskId_studentId: { taskId, studentId: studentProfileId } },
    });
    if (existing) {
      throw new ConflictException({
        errorCode: ERROR_CODES.SUBMISSION_ALREADY_COMPLETED,
        message: 'Task already submitted',
      });
    }

    const questionsById = new Map(task.questions.map((q) => [q.id, q]));
    let score = 0;
    const answerRecords = dto.answers.map((entry) => {
      const question = questionsById.get(entry.questionId);
      const isCorrect = !!question && gradeAnswer(question, entry.answer);
      if (isCorrect) score += 1;
      return { questionId: entry.questionId, studentAnswer: entry.answer, isCorrect };
    });

    try {
      return await this.prisma.submission.create({
        data: {
          taskId,
          studentId: studentProfileId,
          status: SubmissionStatus.COMPLETED,
          score,
          submittedAt: new Date(),
          answers: { create: answerRecords },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          errorCode: ERROR_CODES.SUBMISSION_ALREADY_COMPLETED,
          message: 'Task already submitted',
        });
      }
      throw error;
    }
  }
}
