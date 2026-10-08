import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { generateFourDigitPassword, hashPassword } from '../auth/password.util';
import { decryptCredential, encryptCredential } from '../common/crypto/credential-crypto.util';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { parseExcelToJSON, generateExcelBuffer } from '../common/utils/excel.util';
import { EXCEL_COLUMNS, EXCEL_SHEETS } from '../common/constants/excel.constant';

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
            currentPassword: encryptCredential(temporaryPassword),
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

    try {
      const [items, total] = await this.prisma.$transaction([
        this.prisma.teacherProfile.findMany({
          skip,
          take: limit,
          include: { user: { select: { username: true, isActive: true, currentPassword: true } } },
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
          temporaryPassword: t.user.currentPassword ? decryptCredential(t.user.currentPassword) : null,
        })),
        meta: {
          total,
          page,
          lastPage: Math.ceil(total / limit),
        },
      };
    } catch {
      return {
        data: [],
        meta: {
          total: 0,
          page,
          lastPage: 0,
        },
      };
    }
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
      data: { passwordHash, currentPassword: encryptCredential(temporaryPassword) },
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

  async remove(teacherProfileId: string, force: boolean = false) {
    const profile = await this.prisma.teacherProfile.findUnique({ where: { id: teacherProfileId } });
    if (!profile) {
      throw new NotFoundException({ errorCode: ERROR_CODES.TEACHER_NOT_FOUND, message: 'Teacher not found' });
    }
    const groupCount = await this.prisma.group.count({ where: { teacherId: teacherProfileId } });
    if (groupCount > 0) {
      if (!force) {
        throw new ConflictException({ errorCode: ERROR_CODES.TEACHER_HAS_GROUPS, message: 'Teacher still has groups' });
      } else {
        const students = await this.prisma.studentProfile.findMany({
          where: { group: { teacherId: teacherProfileId } }
        });
        const userIds = students.map(s => s.userId);
        if (userIds.length > 0) {
          await this.prisma.user.deleteMany({ where: { id: { in: userIds } } });
        }
      }
    }
    
    // Deleting the user will cascade delete TeacherProfile, Groups, and IeltsTasks.
    await this.prisma.user.delete({ where: { id: profile.userId } });
  }

  async importExcel(fileBuffer: Buffer) {
    const data = parseExcelToJSON(fileBuffer);
    const sheet = data[Object.keys(data)[0]];
    if (!sheet) return { success: 0, results: [] };

    const results = [];
    let success = 0;
    for (const row of sheet) {
      const firstName = row[EXCEL_COLUMNS.FIRST_NAME];
      const lastName = row[EXCEL_COLUMNS.LAST_NAME];
      const username = row[EXCEL_COLUMNS.LOGIN];
      if (!firstName || !lastName || !username) continue;

      const temporaryPassword = generateFourDigitPassword();
      const passwordHash = await hashPassword(temporaryPassword);

      try {
        const { user } = await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { username: String(username), passwordHash, currentPassword: encryptCredential(temporaryPassword), role: Role.TEACHER },
          });
          const profile = await tx.teacherProfile.create({
            data: { userId: user.id, firstName: String(firstName), lastName: String(lastName) },
          });
          return { user, profile };
        });
        results.push({ username: user.username, temporaryPassword });
        success++;
      } catch (err) {
        // Skip duplicate usernames
      }
    }
    return { success, results };
  }

  async exportExcel() {
    const teachers = await this.prisma.teacherProfile.findMany({
      include: { user: { select: { username: true } } },
    });
    
    const data = teachers.length > 0
      ? teachers.map(t => ({
          [EXCEL_COLUMNS.FIRST_NAME]: t.firstName,
          [EXCEL_COLUMNS.LAST_NAME]: t.lastName,
          [EXCEL_COLUMNS.LOGIN]: t.user.username,
        }))
      : [
          {
            [EXCEL_COLUMNS.FIRST_NAME]: 'Anvar',
            [EXCEL_COLUMNS.LAST_NAME]: 'Aliyev',
            [EXCEL_COLUMNS.LOGIN]: 'teacher_anvar',
          },
        ];

    return generateExcelBuffer({ [EXCEL_SHEETS.TEACHERS]: data });
  }
}
