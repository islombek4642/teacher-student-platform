import { NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { TasksService } from './tasks.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';

describe('TasksService', () => {
  it('creates a task with questions inside a group the teacher owns', async () => {
    const groupsService = {
      findOneOwned: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
    } as unknown as GroupsService;
    const prisma = {
      subject: {
        findUnique: jest.fn().mockResolvedValue({ id: 'subject-1', code: 'ENGLISH' }),
      },
      task: {
        create: jest.fn().mockResolvedValue({
          id: 'task-1',
          title: 'Present Simple',
          questions: [{ id: 'q1', type: QuestionType.FILL_BLANK }],
        }),
      },
    } as unknown as PrismaService;
    const service = new TasksService(prisma, groupsService);

    const result = await service.create('t1', {
      subjectCode: 'ENGLISH',
      groupId: 'g1',
      title: 'Present Simple',
      description: null,
      questions: [{ type: QuestionType.FILL_BLANK, text: 'He ___ to school.', correctAnswer: 'goes' }],
    });

    expect(groupsService.findOneOwned).toHaveBeenCalledWith('t1', 'g1');
    expect(result.id).toBe('task-1');
  });

  it('findOneOwned throws NotFoundException for a task belonging to another teacher', async () => {
    const groupsService = {} as unknown as GroupsService;
    const prisma = {
      task: { findUnique: jest.fn().mockResolvedValue({ id: 'task-1', teacherId: 'other' }) },
    } as unknown as PrismaService;
    const service = new TasksService(prisma, groupsService);

    await expect(service.findOneOwned('t1', 'task-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
