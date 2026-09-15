import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { generateFourDigitPassword, hashPassword } from '../auth/password.util';
import { CreateStudentDto } from './dto/create-student.dto';

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

    const { user, profile } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username: dto.username, passwordHash, role: Role.STUDENT },
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
  }

  async findAllInGroup(teacherProfileId: string, groupId: string) {
    await this.groupsService.findOneOwned(teacherProfileId, groupId);
    const students = await this.prisma.studentProfile.findMany({
      where: { groupId },
      include: { user: { select: { username: true, isActive: true } } },
    });
    return students.map((s) => ({
      id: s.id,
      username: s.user.username,
      firstName: s.firstName,
      lastName: s.lastName,
    }));
  }
}
