import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { GroupsService } from '../groups/groups.service';
import { generateFourDigitPassword, hashPassword } from '../auth/password.util';
import { decryptCredential, encryptCredential } from '../common/crypto/credential-crypto.util';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  async create(teacherProfileId: string, groupId: string, dto: CreateStudentDto) {
    await this.groupsService.findOneOwned(teacherProfileId, groupId);

    const temporaryPassword = generateFourDigitPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    try {
      const { user, profile } = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username: dto.username,
            passwordHash,
            currentPassword: encryptCredential(temporaryPassword),
            role: Role.STUDENT,
          },
        });
        const profile = await tx.studentProfile.create({
          data: { userId: user.id, firstName: dto.firstName, lastName: dto.lastName, groupId },
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

  async findOneOwned(teacherProfileId: string, studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { group: true },
    });
    if (!student || student.group.teacherId !== teacherProfileId) {
      throw new NotFoundException({ errorCode: ERROR_CODES.STUDENT_NOT_FOUND, message: 'Student not found' });
    }
    return student;
  }

  async update(teacherProfileId: string, studentProfileId: string, dto: UpdateStudentDto) {
    await this.findOneOwned(teacherProfileId, studentProfileId);
    return this.prisma.studentProfile.update({
      where: { id: studentProfileId },
      data: { firstName: dto.firstName, lastName: dto.lastName },
    });
  }

  async resetPassword(teacherProfileId: string, studentProfileId: string) {
    const student = await this.findOneOwned(teacherProfileId, studentProfileId);
    const temporaryPassword = generateFourDigitPassword();
    const passwordHash = await hashPassword(temporaryPassword);
    await this.prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash, currentPassword: encryptCredential(temporaryPassword) },
    });
    return { temporaryPassword };
  }

  async remove(teacherProfileId: string, studentProfileId: string) {
    const student = await this.findOneOwned(teacherProfileId, studentProfileId);
    await this.prisma.$transaction([
      this.prisma.studentProfile.delete({ where: { id: studentProfileId } }),
      this.prisma.user.delete({ where: { id: student.userId } }),
    ]);
  }

  async findAllInGroup(teacherProfileId: string, groupId: string) {
    await this.groupsService.findOneOwned(teacherProfileId, groupId);
    const students = await this.prisma.studentProfile.findMany({
      where: { groupId },
      include: { user: { select: { username: true, isActive: true, currentPassword: true } } },
    });
    return students.map((s) => ({
      id: s.id,
      username: s.user.username,
      firstName: s.firstName,
      lastName: s.lastName,
      temporaryPassword: s.user.currentPassword ? decryptCredential(s.user.currentPassword) : null,
    }));
  }
}
