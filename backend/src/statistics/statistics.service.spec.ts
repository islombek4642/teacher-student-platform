import { StatisticsService } from './statistics.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';

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
    const service = new StatisticsService(prisma, groupsService);

    const leaderboard = await service.leaderboard('t1', 'g1');

    expect(leaderboard.map((entry) => entry.studentId)).toEqual(['s2', 's1']);
    expect(leaderboard[0].totalScore).toBe(5);
    expect(leaderboard[1].totalScore).toBe(5);
  });
});
