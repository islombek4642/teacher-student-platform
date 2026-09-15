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

    const profileId = user.teacherProfile?.id ?? user.studentProfile?.id ?? null;
    return { sub: user.id, role: user.role, profileId };
  }

  login(payload: JwtPayload): { accessToken: string } {
    return { accessToken: this.jwtService.sign(payload) };
  }
}
