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
          studentProfile: { id: 'profile-1' },
          teacherProfile: null,
        }),
      },
    } as unknown as PrismaService;
    const jwtService = { sign: jest.fn().mockReturnValue('signed-token') } as unknown as JwtService;
    const service = new AuthService(prisma, jwtService);

    const payload = await service.validateUser('student1', '1234');

    expect(payload).toEqual({ sub: 'user-1', role: Role.STUDENT, profileId: 'profile-1' });
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
});
