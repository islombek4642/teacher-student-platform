import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { hashPassword } from './password.util';

describe('AuthService', () => {
  it('validateUser returns a JwtPayload for correct credentials', async () => {
    const passwordHash = await hashPassword('1234');
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          username: 'student1',
          passwordHash,
          role: Role.STUDENT,
          isActive: true,
          studentProfile: { id: 'profile-1', firstName: 'Ali', lastName: 'Valiyev' },
          teacherProfile: null,
        }),
      },
    } as unknown as PrismaService;
    const jwtService = { sign: jest.fn().mockReturnValue('signed-token') } as unknown as JwtService;
    const service = new AuthService(prisma, jwtService);

    const payload = await service.validateUser('student1', '1234');

    expect(payload).toEqual({
      sub: 'user-1',
      role: Role.STUDENT,
      profileId: 'profile-1',
      firstName: 'Ali',
      lastName: 'Valiyev',
    });
  });

  it('validateUser rejects an incorrect password', async () => {
    const passwordHash = await hashPassword('1234');
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          username: 'student1',
          passwordHash,
          role: Role.STUDENT,
          isActive: true,
          studentProfile: { id: 'profile-1' },
          teacherProfile: null,
        }),
      },
    } as unknown as PrismaService;
    const jwtService = { sign: jest.fn() } as unknown as JwtService;
    const service = new AuthService(prisma, jwtService);

    await expect(service.validateUser('student1', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('changePassword updates passwordHash and reversible currentPassword on valid credentials', async () => {
    const passwordHash = await hashPassword('currentPass123');
    const userUpdateMock = jest.fn().mockResolvedValue({ id: 'user-1' });
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          passwordHash,
        }),
        update: userUpdateMock,
      },
    } as unknown as PrismaService;
    const jwtService = {} as unknown as JwtService;
    const service = new AuthService(prisma, jwtService);

    const result = await service.changePassword('user-1', {
      currentPassword: 'currentPass123',
      newPassword: 'newSecretPassword456',
    });

    expect(result).toEqual({ success: true, message: 'Password changed successfully' });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        passwordHash: expect.any(String),
      }),
    });
  });

  it('changePassword rejects incorrect current password', async () => {
    const passwordHash = await hashPassword('correctPass123');
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          passwordHash,
        }),
      },
    } as unknown as PrismaService;
    const jwtService = {} as unknown as JwtService;
    const service = new AuthService(prisma, jwtService);

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'wrongPassword',
        newPassword: 'newSecretPassword456',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('updateProfile updates teacherProfile name when role is TEACHER', async () => {
    const teacherUpdateMock = jest.fn().mockResolvedValue({ id: 't-1' });
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          role: Role.TEACHER,
          teacherProfile: { id: 't-1' },
          studentProfile: null,
        }),
      },
      teacherProfile: { update: teacherUpdateMock },
    } as unknown as PrismaService;
    const jwtService = {} as unknown as JwtService;
    const service = new AuthService(prisma, jwtService);

    const result = await service.updateProfile('user-1', {
      firstName: 'NewFirst',
      lastName: 'NewLast',
    });

    expect(result).toEqual({ success: true, firstName: 'NewFirst', lastName: 'NewLast' });
    expect(teacherUpdateMock).toHaveBeenCalledWith({
      where: { id: 't-1' },
      data: { firstName: 'NewFirst', lastName: 'NewLast' },
    });
  });
});
