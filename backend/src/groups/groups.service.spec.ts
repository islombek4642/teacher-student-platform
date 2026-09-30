import { ConflictException, NotFoundException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('GroupsService', () => {
  it('creates a group owned by the given teacher', async () => {
    const prisma = {
      group: { create: jest.fn().mockResolvedValue({ id: 'g1', name: '9-A', teacherId: 't1' }) },
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    const result = await service.create('t1', { name: '9-A' });

    expect(prisma.group.create).toHaveBeenCalledWith({ data: { name: '9-A', teacherId: 't1' } });
    expect(result.id).toBe('g1');
  });

  it('findOneOwned throws NotFoundException when the group belongs to another teacher', async () => {
    const prisma = {
      group: { findUnique: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 'other-teacher' }) },
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    await expect(service.findOneOwned('t1', 'g1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rename updates the group name for its owning teacher', async () => {
    const prisma = {
      group: {
        findUnique: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1', name: 'old' }),
        update: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1', name: 'new' }),
      },
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    const result = await service.rename('t1', 'g1', 'new');

    expect(prisma.group.update).toHaveBeenCalledWith({ where: { id: 'g1' }, data: { name: 'new' } });
    expect(result.name).toBe('new');
  });

  it('remove throws NotFoundException when the group belongs to another teacher', async () => {
    const prisma = {
      group: { findUnique: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 'other' }) },
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    await expect(service.remove('t1', 'g1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove rejects deleting a group that still has students or tasks', async () => {
    const prisma = {
      group: {
        findUnique: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
        delete: jest.fn(),
      },
      studentProfile: { count: jest.fn().mockResolvedValue(1) },
      task: { count: jest.fn().mockResolvedValue(0) },
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    await expect(service.remove('t1', 'g1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.group.delete).not.toHaveBeenCalled();
  });

  it('exportGroupsExcel produces a valid buffer with groups and students', async () => {
    const prisma = {
      group: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'g1',
            name: 'Group 1',
            students: [
              {
                firstName: 'Ali',
                lastName: 'Valiyev',
                user: { username: 'ali_valiyev' },
              },
            ],
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    const buffer = await service.exportGroupsExcel('t1');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('exportGroupsExcel produces a valid fallback buffer when teacher has no groups', async () => {
    const prisma = {
      group: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    const buffer = await service.exportGroupsExcel('t1');
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  describe('getGroupTasks', () => {
    it('returns tasks with group submission statistics', async () => {
      const prisma = {
        group: {
          findUnique: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
        },
        studentProfile: {
          findMany: jest.fn().mockResolvedValue([{ id: 'sp1' }, { id: 'sp2' }]),
        },
        ieltsTask: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'task-1',
              title: 'Task 1',
              type: 'READING',
              groupId: 'g1',
              createdAt: new Date(),
              submissions: [
                { studentId: 'sp1', band: 7.0 },
              ],
            },
          ]),
        },
      } as unknown as PrismaService;
      const service = new GroupsService(prisma);

      const tasks = await (service as any).getGroupTasks('t1', 'g1');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-1');
      expect(tasks[0].isAssigned).toBe(true);
      expect(tasks[0].studentCount).toBe(2);
      expect(tasks[0].submissionCount).toBe(1);
      expect(tasks[0].averageBand).toBe(7.0);
    });
  });

  describe('getGroupOverviewStatistics', () => {
    it('handles 0 students or 0 submissions gracefully without NaN', async () => {
      const prisma = {
        group: {
          findUnique: jest.fn().mockResolvedValue({ id: 'g1', name: 'Group 1', teacherId: 't1' }),
        },
        studentProfile: {
          count: jest.fn().mockResolvedValue(0),
        },
        ieltsSubmission: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      } as unknown as PrismaService;
      const service = new GroupsService(prisma);

      const stats = await (service as any).getGroupOverviewStatistics('t1', 'g1');
      expect(stats.averageBand).toBe(0);
      expect(stats.totalStudents).toBe(0);
      expect(stats.totalSubmissions).toBe(0);
      expect(stats.completionRate).toBe(0);
    });
  });

  describe('getGroupLeaderboard', () => {
    it('ranks students by average band descending', async () => {
      const prisma = {
        group: {
          findUnique: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
        },
        studentProfile: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'sp1',
              firstName: 'Ali',
              lastName: 'Valiyev',
              user: { username: 'ali' },
              submissions: [{ band: 6.0 }, { band: 7.0 }],
            },
            {
              id: 'sp2',
              firstName: 'Vali',
              lastName: 'Aliyev',
              user: { username: 'vali' },
              submissions: [{ band: 8.5 }],
            },
          ]),
        },
      } as unknown as PrismaService;
      const service = new GroupsService(prisma);

      const leaderboard = await (service as any).getGroupLeaderboard('t1', 'g1');
      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0].username).toBe('vali');
      expect(leaderboard[0].averageBand).toBe(8.5);
      expect(leaderboard[1].username).toBe('ali');
      expect(leaderboard[1].averageBand).toBe(6.5);
    });
  });
});
