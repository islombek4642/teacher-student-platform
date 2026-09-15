import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  it('throws ConflictException with ERR_USERNAME_TAKEN when the username already exists', async () => {
    const groupsService = {
      findOneOwned: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
    } as unknown as GroupsService;
    const prisma = {
      $transaction: jest.fn().mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      ),
    } as unknown as PrismaService;
    const service = new StudentsService(prisma, groupsService);

    expect.assertions(2);
    try {
      await service.create('t1', 'g1', { username: 'student.anvar', firstName: 'Anvar', lastName: 'Qodirov' });
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toMatchObject({ errorCode: 'ERR_USERNAME_TAKEN' });
    }
  });

  describe('findOneOwned', () => {
    it('throws NotFoundException when the student belongs to another teacher\'s group', async () => {
      const prisma = {
        studentProfile: {
          findUnique: jest.fn().mockResolvedValue({ id: 's1', group: { teacherId: 'other' } }),
        },
      } as unknown as PrismaService;
      const service = new StudentsService(prisma, {} as GroupsService);

      await expect(service.findOneOwned('t1', 's1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates the student\'s name', async () => {
      const prisma = {
        studentProfile: {
          findUnique: jest.fn().mockResolvedValue({ id: 's1', group: { teacherId: 't1' } }),
          update: jest.fn().mockResolvedValue({ id: 's1', firstName: 'New', lastName: 'Name' }),
        },
      } as unknown as PrismaService;
      const service = new StudentsService(prisma, {} as GroupsService);

      const result = await service.update('t1', 's1', { firstName: 'New', lastName: 'Name' });

      expect(prisma.studentProfile.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { firstName: 'New', lastName: 'Name' },
      });
      expect(result.firstName).toBe('New');
    });
  });

  describe('remove', () => {
    it('deletes the student profile and user record when there are no submissions', async () => {
      const prisma = {
        studentProfile: {
          findUnique: jest.fn().mockResolvedValue({ id: 's1', userId: 'u1', group: { teacherId: 't1' } }),
          delete: jest.fn().mockResolvedValue({}),
        },
        user: { delete: jest.fn().mockResolvedValue({}) },
        submission: { count: jest.fn().mockResolvedValue(0) },
        $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
      } as unknown as PrismaService;
      const service = new StudentsService(prisma, {} as GroupsService);

      await service.remove('t1', 's1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.studentProfile.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
    });

    it('rejects deleting a student that has submissions', async () => {
      const prisma = {
        studentProfile: {
          findUnique: jest.fn().mockResolvedValue({ id: 's1', userId: 'u1', group: { teacherId: 't1' } }),
          delete: jest.fn(),
        },
        user: { delete: jest.fn() },
        submission: { count: jest.fn().mockResolvedValue(3) },
      } as unknown as PrismaService;
      const service = new StudentsService(prisma, {} as GroupsService);

      await expect(service.remove('t1', 's1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.studentProfile.delete).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('generates a new one-time password and updates the hash', async () => {
      const prisma = {
        studentProfile: {
          findUnique: jest.fn().mockResolvedValue({ id: 's1', userId: 'u1', group: { teacherId: 't1' } }),
        },
        user: { update: jest.fn().mockResolvedValue({}) },
      } as unknown as PrismaService;
      const service = new StudentsService(prisma, {} as GroupsService);

      const result = await service.resetPassword('t1', 's1');

      expect(result.temporaryPassword).toMatch(/^\d{4}$/);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { passwordHash: expect.any(String) },
      });
    });
  });
});
