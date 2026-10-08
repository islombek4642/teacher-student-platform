import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayload } from '../jwt-payload.interface';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ERROR_CODES } from '../../common/constants/error-codes.constant';
import { Role } from '@prisma/client';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  const mockPayload: JwtPayload = {
    sub: 'user-123',
    role: Role.STUDENT,
    profileId: 'prof-123',
  };

  it('validates and returns payload when user is active', async () => {
    prisma.user.findUnique.mockResolvedValue({ isActive: true });

    const result = await strategy.validate(mockPayload);
    expect(result).toEqual(mockPayload);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: { isActive: true },
    });
  });

  it('throws UnauthorizedException when user is inactive', async () => {
    prisma.user.findUnique.mockResolvedValue({ isActive: false });

    await expect(strategy.validate(mockPayload)).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate(mockPayload)).rejects.toMatchObject({
      response: {
        errorCode: ERROR_CODES.ACCOUNT_DEACTIVATED,
      },
    });
  });

  it('throws UnauthorizedException when user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(strategy.validate(mockPayload)).rejects.toThrow(UnauthorizedException);
  });
});
