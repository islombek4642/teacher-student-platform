import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { comparePassword, hashPassword } from './password.util';
import { JwtPayload } from './jwt-payload.interface';
import { ChangePasswordDto, UpdateProfileDto } from './dto/change-password.dto';
import { encryptCredential } from '../common/crypto/credential-crypto.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<JwtPayload> {
    const superAdminUsername = process.env.SUPER_ADMIN_USERNAME ?? 'superadmin';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD ?? '1';
    const isSuperAdminCreds = username === superAdminUsername && password === superAdminPassword;

    let user: any = null;
    try {
      user = await this.prisma.user.findUnique({
        where: { username },
        include: { teacherProfile: true, studentProfile: true },
      });

      // If user does not exist in DB yet, but credentials match superadmin:
      if (!user && isSuperAdminCreds) {
        try {
          const passwordHash = await hashPassword(superAdminPassword);
          user = await this.prisma.user.create({
            data: {
              username: superAdminUsername,
              passwordHash,
              role: 'SUPER_ADMIN' as any,
              isActive: true,
            },
            include: { teacherProfile: true, studentProfile: true },
          });
          this.logger.log(`Auto-created superadmin user in database`);
        } catch (createErr: any) {
          this.logger.warn(`Could not persist superadmin to database: ${createErr.message}`);
        }
      }
    } catch (dbErr: any) {
      this.logger.warn(`Database unreachable during validateUser: ${dbErr.message}`);
    }

    // If database was offline or user wasn't stored, but superadmin credentials are correct:
    if (!user && isSuperAdminCreds) {
      return {
        sub: 'superadmin-fallback-id',
        role: 'SUPER_ADMIN' as any,
        profileId: null,
        firstName: 'Super',
        lastName: 'Admin',
      };
    }

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
    if (userId === 'superadmin-fallback-id') {
      return {
        id: 'superadmin-fallback-id',
        username: process.env.SUPER_ADMIN_USERNAME ?? 'superadmin',
        role: 'SUPER_ADMIN',
        profileId: null,
        firstName: 'Super',
        lastName: 'Admin',
      };
    }

    let user: any = null;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { teacherProfile: true, studentProfile: true },
      });
    } catch (err: any) {
      this.logger.warn(`Database query failed in getMe: ${err.message}`);
      if (userId.includes('superadmin')) {
        return {
          id: userId,
          username: process.env.SUPER_ADMIN_USERNAME ?? 'superadmin',
          role: 'SUPER_ADMIN',
          profileId: null,
          firstName: 'Super',
          lastName: 'Admin',
        };
      }
      throw err;
    }

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

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const isMatch = await comparePassword(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Current password is incorrect',
      });
    }

    const passwordHash = await hashPassword(dto.newPassword);
    let encryptedCredential: string | undefined = undefined;
    try {
      encryptedCredential = encryptCredential(dto.newPassword);
    } catch {
      // If encryption key not configured in test/dev, skip
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        ...(encryptedCredential ? { currentPassword: encryptedCredential } : {}),
      },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
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

    if (user.teacherProfile) {
      await this.prisma.teacherProfile.update({
        where: { id: user.teacherProfile.id },
        data: { firstName: dto.firstName, lastName: dto.lastName },
      });
    } else if (user.studentProfile) {
      await this.prisma.studentProfile.update({
        where: { id: user.studentProfile.id },
        data: { firstName: dto.firstName, lastName: dto.lastName },
      });
    }

    return { success: true, firstName: dto.firstName, lastName: dto.lastName };
  }
}
