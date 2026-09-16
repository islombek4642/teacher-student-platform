import { ConflictException, NotFoundException } from '@nestjs/common';
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

  describe('findAssignedToStudent', () => {
    it("attaches the student's own submission (if any) to each task", async () => {
      const prisma = {
        task: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'task-1', title: 'Done task', questions: [], submissions: [{ score: 2, submittedAt: new Date('2026-01-01') }] },
            { id: 'task-2', title: 'Pending task', questions: [], submissions: [] },
          ]),
        },
      } as unknown as PrismaService;
      const service = new TasksService(prisma, {} as GroupsService);

      const result = await service.findAssignedToStudent('s1', 'g1');

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { groupId: 'g1' } }),
      );
      expect(result[0].mySubmission).toEqual({ score: 2, submittedAt: new Date('2026-01-01') });
      expect(result[1].mySubmission).toBeNull();
      expect((result[0] as { submissions?: unknown }).submissions).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('deletes a task that has no submissions', async () => {
      const prisma = {
        task: {
          findUnique: jest.fn().mockResolvedValue({ id: 'task-1', teacherId: 't1' }),
          delete: jest.fn().mockResolvedValue({}),
        },
        question: { deleteMany: jest.fn().mockResolvedValue({}) },
        submission: { count: jest.fn().mockResolvedValue(0) },
      } as unknown as PrismaService;
      const service = new TasksService(prisma, {} as GroupsService);

      await service.remove('t1', 'task-1');

      expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } });
    });

    it('rejects deleting a task that already has submissions', async () => {
      const prisma = {
        task: { findUnique: jest.fn().mockResolvedValue({ id: 'task-1', teacherId: 't1' }) },
        submission: { count: jest.fn().mockResolvedValue(2) },
      } as unknown as PrismaService;
      const service = new TasksService(prisma, {} as GroupsService);

      await expect(service.remove('t1', 'task-1')).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
