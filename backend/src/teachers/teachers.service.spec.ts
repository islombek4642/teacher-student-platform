import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { TeachersService } from './teachers.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { decryptCredential } from '../common/crypto/credential-crypto.util';

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

  describe('resetPassword', () => {
    it("generates a new one-time password and updates the teacher's hash", async () => {
      const prisma = {
        teacherProfile: { findUnique: jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' }) },
        user: { update: jest.fn().mockResolvedValue({}) },
      } as unknown as PrismaService;
      const service = new TeachersService(prisma);

      const result = await service.resetPassword('t1');

      expect(result.temporaryPassword).toMatch(/^\d{4}$/);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { passwordHash: expect.any(String) },
      });
    });

    it('throws NotFoundException when the teacher does not exist', async () => {
      const prisma = {
        teacherProfile: { findUnique: jest.fn().mockResolvedValue(null) },
      } as unknown as PrismaService;
      const service = new TeachersService(prisma);

      await expect(service.resetPassword('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
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

  describe('remove', () => {
    it('throws ConflictException and does not delete when the teacher still has groups', async () => {
      const teacherProfileDelete = jest.fn();
      const userDelete = jest.fn();
      const prisma = {
        teacherProfile: {
          findUnique: jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' }),
          delete: teacherProfileDelete,
        },
        user: { delete: userDelete },
        group: { count: jest.fn().mockResolvedValue(2) },
        $transaction: jest.fn(),
      } as unknown as PrismaService;
      const service = new TeachersService(prisma);

      await expect(service.remove('t1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.teacherProfile.delete).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('deletes the teacher profile and user in a transaction when there are no groups', async () => {
      const prisma = {
        teacherProfile: {
          findUnique: jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' }),
          delete: jest.fn().mockResolvedValue({ id: 't1' }),
        },
        user: { delete: jest.fn().mockResolvedValue({ id: 'u1' }) },
        group: { count: jest.fn().mockResolvedValue(0) },
        $transaction: jest.fn().mockResolvedValue(undefined),
      } as unknown as PrismaService;
      const service = new TeachersService(prisma);

      await service.remove('t1');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.teacherProfile.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });
  });
});
