import { StudentsService } from './students.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';

describe('StudentsService', () => {
  it('creates a student inside a group the teacher owns, with a one-time password', async () => {
    const groupsService = {
      findOneOwned: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
    } as unknown as GroupsService;
    const prisma = {
      $transaction: jest.fn(async (fn: any) =>
        fn({
          user: { create: jest.fn().mockResolvedValue({ id: 'user-1', username: 'student.anvar' }) },
          studentProfile: {
            create: jest
              .fn()
              .mockResolvedValue({ id: 'profile-1', firstName: 'Anvar', lastName: 'Qodirov', groupId: 'g1' }),
          },
        }),
      ),
    } as unknown as PrismaService;
    const service = new StudentsService(prisma, groupsService);

    const result = await service.create('t1', 'g1', {
      username: 'student.anvar',
      firstName: 'Anvar',
      lastName: 'Qodirov',
    });

    expect(groupsService.findOneOwned).toHaveBeenCalledWith('t1', 'g1');
    expect(result.temporaryPassword).toMatch(/^\d{4}$/);
  });
});
