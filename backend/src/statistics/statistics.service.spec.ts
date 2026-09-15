import { NotFoundException } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { TasksService } from '../tasks/tasks.service';

describe('StatisticsService', () => {
  it('leaderboard ranks students by total score, highest first', async () => {
    const groupsService = {
      findOneOwned: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
    } as unknown as GroupsService;
    const prisma = {
      studentProfile: {
        findMany: jest.fn().mockResolvedValue([
          { id: 's2', firstName: 'B', lastName: 'B', submissions: [{ score: 5 }] },
          { id: 's1', firstName: 'A', lastName: 'A', submissions: [{ score: 2 }, { score: 3 }] },
        ]),
      },
    } as unknown as PrismaService;
    const tasksService = {} as unknown as TasksService;
    const service = new StatisticsService(prisma, groupsService, tasksService);

    const leaderboard = await service.leaderboard('t1', 'g1');

    expect(leaderboard.map((entry) => entry.studentId)).toEqual(['s2', 's1']);
    expect(leaderboard[0].totalScore).toBe(5);
    expect(leaderboard[1].totalScore).toBe(5);
  });

  it('groupOverview aggregates student count, total submissions, and average score', async () => {
    const groupsService = {
      findOneOwned: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
    } as unknown as GroupsService;
    const prisma = {
      studentProfile: {
        findMany: jest.fn().mockResolvedValue([
          { id: 's1', submissions: [{ score: 3 }] },
          { id: 's2', submissions: [{ score: 1 }, { score: 2 }] },
        ]),
      },
    } as unknown as PrismaService;
    const tasksService = {} as unknown as TasksService;
    const service = new StatisticsService(prisma, groupsService, tasksService);

    const overview = await service.groupOverview('t1', 'g1');

    expect(overview.studentCount).toBe(2);
    expect(overview.tasksCompleted).toBe(3);
    expect(overview.averageScore).toBe(2);
  });

  it('taskStats returns submission stats and the most missed question for a task the teacher owns', async () => {
    const prisma = {
      submission: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sub1',
            score: 5,
            answers: [
              { questionId: 'q1', isCorrect: false },
              { questionId: 'q2', isCorrect: true },
            ],
          },
          {
            id: 'sub2',
            score: 7,
            answers: [{ questionId: 'q1', isCorrect: false }],
          },
        ]),
      },
    } as unknown as PrismaService;
    const groupsService = {} as unknown as GroupsService;
    const tasksService = {
      findOneOwned: jest.fn().mockResolvedValue({ id: 'task1', teacherId: 't1' }),
    } as unknown as TasksService;
    const service = new StatisticsService(prisma, groupsService, tasksService);

    const stats = await service.taskStats('t1', 'task1');

    expect(stats.submissionCount).toBe(2);
    expect(stats.averageScore).toBe(6);
    expect(stats.mostMissedQuestionIds).toEqual(['q1']);
  });

  it('taskStats returns zeroed stats for a task the teacher does not own', async () => {
    const prisma = {
      submission: {
        findMany: jest.fn(),
      },
    } as unknown as PrismaService;
    const groupsService = {} as unknown as GroupsService;
    const tasksService = {
      findOneOwned: jest.fn().mockRejectedValue(new NotFoundException({ errorCode: 'ERR_TASK_NOT_FOUND' })),
    } as unknown as TasksService;
    const service = new StatisticsService(prisma, groupsService, tasksService);

    const stats = await service.taskStats('t1', 'foreign-task');

    expect(stats).toEqual({ submissionCount: 0, averageScore: 0, mostMissedQuestionIds: [] });
    expect(prisma.submission.findMany).not.toHaveBeenCalled();
  });

  it('studentProgress reports completed task count, average score, and last activity date', async () => {
    const mostRecent = new Date('2026-09-10T00:00:00Z');
    const older = new Date('2026-09-01T00:00:00Z');
    const prisma = {
      submission: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'sub2', score: 8, submittedAt: mostRecent },
          { id: 'sub1', score: 4, submittedAt: older },
        ]),
      },
    } as unknown as PrismaService;
    const groupsService = {} as unknown as GroupsService;
    const tasksService = {} as unknown as TasksService;
    const service = new StatisticsService(prisma, groupsService, tasksService);

    const progress = await service.studentProgress('student1');

    expect(progress.tasksCompleted).toBe(2);
    expect(progress.averageScore).toBe(6);
    expect(progress.lastActivityAt).toBe(mostRecent);
  });
});
