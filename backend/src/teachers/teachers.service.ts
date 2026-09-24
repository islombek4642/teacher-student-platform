import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { generateFourDigitPassword, hashPassword } from '../auth/password.util';
import { decryptCredential, encryptCredential } from '../common/crypto/credential-crypto.util';
import { CreateTeacherDto } from './dto/create-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeacherDto) {
    const temporaryPassword = generateFourDigitPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    try {
      const { user, profile } = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: dto.username,
            passwordHash,
            role: Role.TEACHER,
          },
        });
        const profile = await tx.teacherProfile.create({
          data: { userId: user.id, firstName: dto.firstName, lastName: dto.lastName },
        });
        return { user, profile };
      });

      return {
        id: profile.id,
        username: user.username,
        firstName: profile.firstName,
        lastName: profile.lastName,
        temporaryPassword,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ errorCode: ERROR_CODES.USERNAME_TAKEN, message: 'Username already taken' });
      }
      throw error;
    }
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.teacherProfile.findMany({
        skip,
        take: limit,
        include: { user: { select: { username: true, isActive: true } } },
      }),
      this.prisma.teacherProfile.count(),
    ]);

    return {
      data: items.map((t) => ({
        id: t.id,
        username: t.user.username,
        firstName: t.firstName,
        lastName: t.lastName,
        isActive: t.user.isActive,
      })),
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async resetPassword(teacherProfileId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({ where: { id: teacherProfileId } });
    if (!profile) {
      throw new NotFoundException({ errorCode: ERROR_CODES.TEACHER_NOT_FOUND, message: 'Teacher not found' });
    }
    const temporaryPassword = generateFourDigitPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await this.prisma.user.update({
      where: { id: profile.userId },
      data: { passwordHash },
    });
    return { temporaryPassword };
  }

  async setActive(teacherProfileId: string, isActive: boolean) {
    const profile = await this.prisma.teacherProfile.findUnique({ where: { id: teacherProfileId } });
    if (!profile) {
      throw new NotFoundException({ errorCode: ERROR_CODES.TEACHER_NOT_FOUND, message: 'Teacher not found' });
    }
    const user = await this.prisma.user.update({ where: { id: profile.userId }, data: { isActive } });
    return { id: profile.id, isActive: user.isActive };
  }

  async remove(teacherProfileId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({ where: { id: teacherProfileId } });
    if (!profile) {
      throw new NotFoundException({ errorCode: ERROR_CODES.TEACHER_NOT_FOUND, message: 'Teacher not found' });
    }
    const groupCount = await this.prisma.group.count({ where: { teacherId: teacherProfileId } });
    if (groupCount > 0) {
      throw new ConflictException({ errorCode: ERROR_CODES.TEACHER_HAS_GROUPS, message: 'Teacher still has groups' });
    }
    await this.prisma.$transaction([
      this.prisma.teacherProfile.delete({ where: { id: teacherProfileId } }),
      this.prisma.user.delete({ where: { id: profile.userId } }),
    ]);
  }
}
