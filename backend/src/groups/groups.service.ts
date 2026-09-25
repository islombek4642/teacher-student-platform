import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { CreateGroupDto } from './dto/create-group.dto';

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
}
