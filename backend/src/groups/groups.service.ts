import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { CreateGroupDto } from './dto/create-group.dto';
import { parseExcelToJSON, generateExcelBuffer } from '../common/utils/excel.util';
import { generateFourDigitPassword, hashPassword } from '../auth/password.util';
import { encryptCredential } from '../common/crypto/credential-crypto.util';
import { Role } from '@prisma/client';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  create(teacherProfileId: string, dto: CreateGroupDto) {
    return this.prisma.group.create({ data: { name: dto.name, teacherId: teacherProfileId } });
  }

  findAllForTeacher(teacherProfileId: string) {
    return this.prisma.group.findMany({ where: { teacherId: teacherProfileId } });
  }

  async findOneOwned(teacherProfileId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.teacherId !== teacherProfileId) {
      throw new NotFoundException({ errorCode: ERROR_CODES.GROUP_NOT_FOUND, message: 'Group not found' });
    }
    return group;
  }

  async rename(teacherProfileId: string, groupId: string, name: string) {
    await this.findOneOwned(teacherProfileId, groupId);
    return this.prisma.group.update({ where: { id: groupId }, data: { name } });
  }

  async remove(teacherProfileId: string, groupId: string) {
    await this.findOneOwned(teacherProfileId, groupId);
    const studentCount = await this.prisma.studentProfile.count({ where: { groupId } });
    if (studentCount > 0) {
      throw new ConflictException({
        errorCode: ERROR_CODES.GROUP_HAS_DEPENDENTS,
        message: 'Group still has students',
      });
    }
    await this.prisma.group.delete({ where: { id: groupId } });
  }

  async importGroupsExcel(teacherProfileId: string, fileBuffer: Buffer) {
    const data = parseExcelToJSON(fileBuffer);
    const results = [];
    let success = 0;

    for (const [groupName, rows] of Object.entries(data)) {
      if (!groupName || rows.length === 0) continue;

      let group = await this.prisma.group.findFirst({
        where: { name: groupName, teacherId: teacherProfileId },
      });
      if (!group) {
        group = await this.prisma.group.create({
          data: { name: groupName, teacherId: teacherProfileId },
        });
      }

      for (const row of rows) {
        const firstName = row['Ism'];
        const lastName = row['Familiya'];
        const username = row['Login'];
        if (!firstName || !lastName || !username) continue;

        const temporaryPassword = generateFourDigitPassword();
        const passwordHash = await hashPassword(temporaryPassword);

        try {
          const { user } = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
              data: { username: String(username), passwordHash, currentPassword: encryptCredential(temporaryPassword), role: Role.STUDENT },
            });
            await tx.studentProfile.create({
              data: { userId: user.id, groupId: group.id, firstName: String(firstName), lastName: String(lastName) },
            });
            return { user };
          });
          results.push({ group: groupName, username: user.username, temporaryPassword });
          success++;
        } catch (err) {
          // ignore duplicate username
        }
      }
    }
    return { success, results };
  }

  async exportGroupsExcel(teacherProfileId: string) {
    const groups = await this.prisma.group.findMany({
      where: { teacherId: teacherProfileId },
      include: {
        students: {
          include: { user: { select: { username: true } } },
        },
      },
    });

    const sheetsData: Record<string, any[]> = {};
    for (const group of groups) {
      sheetsData[group.name] = group.students.map(s => ({
        Ism: s.firstName,
        Familiya: s.lastName,
        Login: s.user.username,
      }));
    }

    return generateExcelBuffer(sheetsData);
  }

  async importSingleGroupExcel(teacherProfileId: string, groupId: string, fileBuffer: Buffer) {
    const group = await this.findOneOwned(teacherProfileId, groupId);
    const data = parseExcelToJSON(fileBuffer);
    const sheet = data[Object.keys(data)[0]];
    if (!sheet) return { success: 0, results: [] };

    const results = [];
    let success = 0;

    for (const row of sheet) {
      const firstName = row['Ism'];
      const lastName = row['Familiya'];
      const username = row['Login'];
      if (!firstName || !lastName || !username) continue;

      const temporaryPassword = generateFourDigitPassword();
      const passwordHash = await hashPassword(temporaryPassword);

      try {
        const { user } = await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { username: String(username), passwordHash, currentPassword: encryptCredential(temporaryPassword), role: Role.STUDENT },
          });
          await tx.studentProfile.create({
            data: { userId: user.id, groupId: group.id, firstName: String(firstName), lastName: String(lastName) },
          });
          return { user };
        });
        results.push({ username: user.username, temporaryPassword });
        success++;
      } catch (err) {
        // skip duplicate
      }
    }
    return { success, results };
  }

  async exportSingleGroupExcel(teacherProfileId: string, groupId: string) {
    const group = await this.findOneOwned(teacherProfileId, groupId);
    const students = await this.prisma.studentProfile.findMany({
      where: { groupId },
      include: { user: { select: { username: true } } },
    });

    const data = students.map(s => ({
      Ism: s.firstName,
      Familiya: s.lastName,
      Login: s.user.username,
    }));

    return generateExcelBuffer({ [group.name]: data });
  }
}
