import { Role } from '@prisma/client';
import { TeachersService } from './teachers.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('TeachersService', () => {
  it('creates a teacher user + profile and returns a one-time plaintext password', async () => {
    const prisma = {
      $transaction: jest.fn(async (fn: any) =>
        fn({
          user: { create: jest.fn().mockResolvedValue({ id: 'user-1', username: 'teacher.ali' }) },
          teacherProfile: {
            create: jest.fn().mockResolvedValue({ id: 'profile-1', firstName: 'Ali', lastName: 'Vali' }),
          },
        }),
      ),
    } as unknown as PrismaService;
    const service = new TeachersService(prisma);

    const result = await service.create({ username: 'teacher.ali', firstName: 'Ali', lastName: 'Vali' });

    expect(result.username).toBe('teacher.ali');
    expect(result.temporaryPassword).toMatch(/^\d{4}$/);
  });
});
