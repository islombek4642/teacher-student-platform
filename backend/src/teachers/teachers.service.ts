import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { generateFourDigitPassword, hashPassword } from '../auth/password.util';
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
          data: { username: dto.username, passwordHash, role: Role.TEACHER },
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

  async findAll() {
    const teachers = await this.prisma.teacherProfile.findMany({
      include: { user: { select: { username: true, isActive: true } } },
    });
    return teachers.map((t) => ({
      id: t.id,
      username: t.user.username,
      firstName: t.firstName,
      lastName: t.lastName,
      isActive: t.user.isActive,
    }));
  }
}
