import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { comparePassword } from './password.util';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { teacherProfile: true, studentProfile: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid username or password',
      });
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid username or password',
      });
    }

    const profile = user.teacherProfile ?? user.studentProfile ?? null;
    const profileId = profile?.id ?? null;
    const firstName = profile?.firstName ?? null;
    const lastName = profile?.lastName ?? null;
    return {
      sub: user.id,
      role: user.role,
      profileId,
      firstName,
      lastName,
    };
  }

  login(payload: JwtPayload): { accessToken: string } {
    return { accessToken: this.jwtService.sign(payload) };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { teacherProfile: true, studentProfile: true },
    });
    if (!user) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }
    const profile = user.teacherProfile ?? user.studentProfile ?? null;
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      profileId: profile?.id ?? null,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
    };
  }
}
