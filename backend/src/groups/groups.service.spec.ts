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

  it('remove deletes group and cleans up student User records in a transaction', async () => {
    const tx = {
      studentProfile: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]),
      },
      group: {
        delete: jest.fn().mockResolvedValue({ id: 'g1' }),
      },
      user: {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };

    const prisma = {
      group: {
        findUnique: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(tx)),
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    await service.remove('t1', 'g1');

    expect(tx.studentProfile.findMany).toHaveBeenCalledWith({
      where: { groupId: 'g1' },
      select: { userId: true },
    });
    expect(tx.group.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
    expect(tx.user.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u2'] } },
    });
  });

  it('remove deletes empty group without calling user.deleteMany', async () => {
    const tx = {
      studentProfile: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      group: {
        delete: jest.fn().mockResolvedValue({ id: 'g1' }),
      },
      user: {
        deleteMany: jest.fn(),
      },
    };

    const prisma = {
      group: {
        findUnique: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(tx)),
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    await service.remove('t1', 'g1');

    expect(tx.group.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
    expect(tx.user.deleteMany).not.toHaveBeenCalled();
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
      expect(stats.maxBand).toBe(0);
      expect(stats.listeningMaxBand).toBe(0);
      expect(stats.readingMaxBand).toBe(0);
      expect(stats.totalStudents).toBe(0);
      expect(stats.totalSubmissions).toBe(0);
      expect(stats.completionRate).toBe(0);
    });

    it('calculates maxBand, listeningMaxBand, and readingMaxBand correctly', async () => {
      const prisma = {
        group: {
          findUnique: jest.fn().mockResolvedValue({ id: 'g1', name: 'Group 1', teacherId: 't1' }),
        },
        studentProfile: {
          count: jest.fn().mockResolvedValue(2),
        },
        ieltsSubmission: {
          findMany: jest.fn().mockResolvedValue([
            { studentId: 's1', taskId: 't1', band: 6.5, task: { id: 't1', type: 'LISTENING' } },
            { studentId: 's2', taskId: 't1', band: 8.0, task: { id: 't1', type: 'LISTENING' } },
            { studentId: 's1', taskId: 't2', band: 7.0, task: { id: 't2', type: 'READING' } },
            { studentId: 's2', taskId: 't2', band: 8.5, task: { id: 't2', type: 'READING' } },
          ]),
        },
      } as unknown as PrismaService;
      const service = new GroupsService(prisma);

      const stats = await (service as any).getGroupOverviewStatistics('t1', 'g1');
      expect(stats.maxBand).toBe(8.5);
      expect(stats.listeningMaxBand).toBe(8.0);
      expect(stats.readingMaxBand).toBe(8.5);
      expect(stats.totalSubmissions).toBe(4);
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
              submissions: [
                { taskId: 'task-1', band: 6.0 },
                { taskId: 'task-2', band: 7.0 },
              ],
            },
            {
              id: 'sp2',
              firstName: 'Vali',
              lastName: 'Aliyev',
              user: { username: 'vali' },
              submissions: [{ taskId: 'task-1', band: 8.5 }],
            },
          ]),
        },
      } as unknown as PrismaService;
      const service = new GroupsService(prisma);

      const leaderboard = await (service as any).getGroupLeaderboard('t1', 'g1');
      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0].username).toBe('vali');
      expect(leaderboard[0].averageBand).toBe(8.5);
      expect(leaderboard[0].bestBand).toBe(8.5);
      expect(leaderboard[0].testsTaken).toBe(1);
      expect(leaderboard[1].username).toBe('ali');
      expect(leaderboard[1].averageBand).toBe(6.5);
      expect(leaderboard[1].bestBand).toBe(7.0);
      expect(leaderboard[1].testsTaken).toBe(2);
    });

    it('calculates average band from best attempt per task', async () => {
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
              submissions: [
                { taskId: 'task-1', band: 5.0 }, // attempt 1
                { taskId: 'task-1', band: 7.0 }, // attempt 2 (best on task-1 is 7.0)
                { taskId: 'task-2', band: 6.0 }, // attempt 1 on task-2
              ],
            },
          ]),
        },
      } as unknown as PrismaService;
      const service = new GroupsService(prisma);

      const leaderboard = await (service as any).getGroupLeaderboard('t1', 'g1');
      expect(leaderboard).toHaveLength(1);
      expect(leaderboard[0].testsTaken).toBe(2);
      expect(leaderboard[0].bestBand).toBe(7.0);
      expect(leaderboard[0].averageBand).toBe(6.5); // (7.0 + 6.0) / 2
    });
  });
});
