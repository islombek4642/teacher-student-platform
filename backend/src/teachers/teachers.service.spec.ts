import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
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

  it('throws ConflictException with ERR_USERNAME_TAKEN when the username already exists', async () => {
    const prisma = {
      $transaction: jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      ),
    } as unknown as PrismaService;
    const service = new TeachersService(prisma);

    expect.assertions(2);
    try {
      await service.create({ username: 'teacher.ali', firstName: 'Ali', lastName: 'Vali' });
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({ errorCode: 'ERR_USERNAME_TAKEN' });
    }
  });

  describe('setActive', () => {
    it("updates the isActive flag on the teacher's user record", async () => {
      const prisma = {
        teacherProfile: { findUnique: jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' }) },
        user: { update: jest.fn().mockResolvedValue({ id: 'u1', isActive: false }) },
      } as unknown as PrismaService;
      const service = new TeachersService(prisma);

      const result = await service.setActive('t1', false);

      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { isActive: false } });
      expect(result.isActive).toBe(false);
    });

    it('throws NotFoundException when the teacher does not exist', async () => {
      const prisma = {
        teacherProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      } as unknown as PrismaService;
      const service = new TeachersService(prisma);

      await expect(service.setActive('missing', false)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
