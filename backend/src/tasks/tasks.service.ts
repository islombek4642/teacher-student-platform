import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { GroupsService } from '../groups/groups.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  async create(teacherProfileId: string, dto: CreateTaskDto) {
    await this.groupsService.findOneOwned(teacherProfileId, dto.groupId);
    const subject = await this.prisma.subject.findUnique({ where: { code: dto.subjectCode } });
    if (!subject) {
      throw new NotFoundException({ errorCode: ERROR_CODES.SUBJECT_NOT_FOUND, message: 'Subject not found' });
    }

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        subjectId: subject.id,
        groupId: dto.groupId,
        teacherId: teacherProfileId,
        questions: {
          create: dto.questions.map((q) => ({
            type: q.type,
            text: q.text,
            options: q.options ?? undefined,
            correctAnswer: q.correctAnswer,
          })),
        },
      },
      include: { questions: true },
    });
  }

  async findOneOwned(teacherProfileId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { questions: true } });
    if (!task || task.teacherId !== teacherProfileId) {
      throw new NotFoundException({ errorCode: ERROR_CODES.TASK_NOT_FOUND, message: 'Task not found' });
    }
    return task;
  }

  async remove(teacherProfileId: string, taskId: string) {
    await this.findOneOwned(teacherProfileId, taskId);
    const submissionCount = await this.prisma.submission.count({ where: { taskId } });
    if (submissionCount > 0) {
      throw new ConflictException({
        errorCode: ERROR_CODES.TASK_HAS_SUBMISSIONS,
        message: 'Task already has submissions',
      });
    }
    await this.prisma.question.deleteMany({ where: { taskId } });
    await this.prisma.task.delete({ where: { id: taskId } });
  }

  async findAllForGroup(teacherProfileId: string, groupId: string) {
    await this.groupsService.findOneOwned(teacherProfileId, groupId);
    return this.prisma.task.findMany({ where: { groupId }, include: { questions: true } });
  }

  async findAssignedToStudent(studentProfileId: string, studentGroupId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { groupId: studentGroupId },
      include: {
        questions: { select: { id: true, type: true, text: true, options: true } },
        submissions: { where: { studentId: studentProfileId }, select: { score: true, submittedAt: true } },
      },
    });
    return tasks.map(({ submissions, ...task }) => ({
      ...task,
      mySubmission: submissions[0] ?? null,
    }));
  }
}
