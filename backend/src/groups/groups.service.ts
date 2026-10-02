import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { CreateGroupDto } from './dto/create-group.dto';
import { parseExcelToJSON, generateExcelBuffer } from '../common/utils/excel.util';
import { generateFourDigitPassword, hashPassword } from '../auth/password.util';
import { encryptCredential } from '../common/crypto/credential-crypto.util';
import { Role } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { EXCEL_COLUMNS } from '../common/constants/excel.constant';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  create(teacherProfileId: string, dto: CreateGroupDto) {
    return this.prisma.group.create({ data: { name: dto.name, teacherId: teacherProfileId } });
  }

  async findAllForTeacher(teacherProfileId: string, query: PaginationQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.group.findMany({ 
        where: { teacherId: teacherProfileId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'asc' }
      }),
      this.prisma.group.count({ where: { teacherId: teacherProfileId } })
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        lastPage: Math.ceil(total / limit),
      },
    };
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
      sheetsData[group.name] = group.students.length > 0
        ? group.students.map(s => ({
            [EXCEL_COLUMNS.FIRST_NAME]: s.firstName,
            [EXCEL_COLUMNS.LAST_NAME]: s.lastName,
            [EXCEL_COLUMNS.LOGIN]: s.user.username,
          }))
        : [
            {
              [EXCEL_COLUMNS.FIRST_NAME]: 'Ali',
              [EXCEL_COLUMNS.LAST_NAME]: 'Valiyev',
              [EXCEL_COLUMNS.LOGIN]: 'student_ali',
            },
          ];
    }

    if (groups.length === 0) {
      sheetsData['Guruh 1'] = [
        {
          [EXCEL_COLUMNS.FIRST_NAME]: 'Ali',
          [EXCEL_COLUMNS.LAST_NAME]: 'Valiyev',
          [EXCEL_COLUMNS.LOGIN]: 'student_ali',
        },
      ];
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
      const firstName = row[EXCEL_COLUMNS.FIRST_NAME];
      const lastName = row[EXCEL_COLUMNS.LAST_NAME];
      const username = row[EXCEL_COLUMNS.LOGIN];
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

    const data = students.length > 0
      ? students.map(s => ({
          [EXCEL_COLUMNS.FIRST_NAME]: s.firstName,
          [EXCEL_COLUMNS.LAST_NAME]: s.lastName,
          [EXCEL_COLUMNS.LOGIN]: s.user.username,
        }))
      : [
          {
            [EXCEL_COLUMNS.FIRST_NAME]: 'Ali',
            [EXCEL_COLUMNS.LAST_NAME]: 'Valiyev',
            [EXCEL_COLUMNS.LOGIN]: 'student_ali',
          },
          {
            [EXCEL_COLUMNS.FIRST_NAME]: 'Salim',
            [EXCEL_COLUMNS.LAST_NAME]: 'Karimov',
            [EXCEL_COLUMNS.LOGIN]: 'student_salim',
          },
        ];

    return generateExcelBuffer({ [group.name]: data });
  }

  async getGroupTasks(teacherProfileId: string, groupId: string) {
    const group = await this.findOneOwned(teacherProfileId, groupId);
    const students = await this.prisma.studentProfile.findMany({
      where: { groupId },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);
    const studentCount = students.length;

    const tasks = await this.prisma.ieltsTask.findMany({
      where: {
        teacherId: group.teacherId,
      },
      include: {
        groupTasks: {
          where: { groupId },
        },
        submissions: {
          where: {
            studentId: { in: studentIds },
          },
          select: {
            studentId: true,
            band: true,
            score: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tasks.map((task) => {
      const isAssigned = (task.groupTasks && task.groupTasks.length > 0) || task.groupId === groupId;
      const studentBestMap = new Map<string, number>();
      for (const sub of task.submissions || []) {
        const currentBest = studentBestMap.get(sub.studentId) ?? 0;
        if (sub.band > currentBest) {
          studentBestMap.set(sub.studentId, sub.band);
        }
      }
      const submissionCount = studentBestMap.size;
      const bestBands = Array.from(studentBestMap.values());
      const averageBand =
        submissionCount > 0
          ? Number(
              (
                bestBands.reduce((acc, curr) => acc + curr, 0) /
                submissionCount
              ).toFixed(1),
            )
          : 0;

      return {
        id: task.id,
        title: task.title,
        type: task.type,
        isAssigned,
        studentCount,
        submissionCount,
        averageBand,
        createdAt: task.createdAt,
      };
    });
  }

  async assignMultipleTasksToGroup(
    teacherProfileId: string,
    groupId: string,
    taskIds: string[],
    assign: boolean = true,
  ) {
    const group = await this.findOneOwned(teacherProfileId, groupId);
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return { success: true, count: 0, isAssigned: assign };
    }

    const validTasks = await this.prisma.ieltsTask.findMany({
      where: {
        id: { in: taskIds },
        teacherId: group.teacherId,
      },
      select: { id: true },
    });
    const validTaskIds = validTasks.map((t) => t.id);

    if (validTaskIds.length === 0) {
      return { success: true, count: 0, isAssigned: assign };
    }

    if (assign) {
      const created = await this.prisma.groupTask.createMany({
        data: validTaskIds.map((taskId) => ({
          groupId,
          taskId,
        })),
        skipDuplicates: true,
      });

      return { success: true, count: created.count, isAssigned: true };
    } else {
      const deleted = await this.prisma.groupTask.deleteMany({
        where: {
          groupId,
          taskId: { in: validTaskIds },
        },
      });

      await this.prisma.ieltsTask.updateMany({
        where: {
          id: { in: validTaskIds },
          groupId,
        },
        data: { groupId: null },
      });

      return { success: true, count: deleted.count, isAssigned: false };
    }
  }

  async assignTaskToGroup(teacherProfileId: string, groupId: string, taskId: string, assign: boolean) {
    return this.assignMultipleTasksToGroup(teacherProfileId, groupId, [taskId], assign);
  }

  async getGroupOverviewStatistics(teacherProfileId: string, groupId: string) {
    const group = await this.findOneOwned(teacherProfileId, groupId);
    const totalStudents = await this.prisma.studentProfile.count({
      where: { groupId },
    });

    const submissions = await this.prisma.ieltsSubmission.findMany({
      where: {
        student: { groupId },
      },
      include: {
        task: {
          select: { id: true, type: true },
        },
      },
    });

    const totalSubmissions = submissions.length;

    const studentTaskBestMap = new Map<string, { band: number; type: string }>();
    for (const sub of submissions) {
      const key = `${sub.studentId}_${sub.taskId}`;
      const existing = studentTaskBestMap.get(key);
      if (!existing || sub.band > existing.band) {
        studentTaskBestMap.set(key, { band: sub.band, type: sub.task?.type });
      }
    }

    const uniqueCompleted = Array.from(studentTaskBestMap.values());
    const averageBand =
      uniqueCompleted.length > 0
        ? Number(
            (
              uniqueCompleted.reduce((acc, s) => acc + s.band, 0) /
              uniqueCompleted.length
            ).toFixed(1),
          )
        : 0;

    const maxBand =
      uniqueCompleted.length > 0
        ? Math.max(...uniqueCompleted.map((s) => s.band))
        : 0;

    const listeningScores = uniqueCompleted.filter((s) => s.type === 'LISTENING');
    const listeningMaxBand =
      listeningScores.length > 0
        ? Math.max(...listeningScores.map((s) => s.band))
        : 0;
    const listeningAverageBand =
      listeningScores.length > 0
        ? Number(
            (
              listeningScores.reduce((acc, s) => acc + s.band, 0) /
              listeningScores.length
            ).toFixed(1),
          )
        : 0;

    const readingScores = uniqueCompleted.filter((s) => s.type === 'READING');
    const readingMaxBand =
      readingScores.length > 0
        ? Math.max(...readingScores.map((s) => s.band))
        : 0;
    const readingAverageBand =
      readingScores.length > 0
        ? Number(
            (
              readingScores.reduce((acc, s) => acc + s.band, 0) /
              readingScores.length
            ).toFixed(1),
          )
        : 0;

    const completionRate =
      totalStudents > 0 && totalSubmissions > 0
        ? Math.min(100, Math.round((totalSubmissions / (totalStudents * 5)) * 100))
        : 0;

    return {
      groupName: group.name,
      totalStudents,
      totalSubmissions,
      averageBand,
      maxBand,
      listeningAverageBand,
      listeningMaxBand,
      readingAverageBand,
      readingMaxBand,
      completionRate,
    };
  }

  async getGroupLeaderboard(teacherProfileId: string, groupId: string) {
    await this.findOneOwned(teacherProfileId, groupId);
    const students = await this.prisma.studentProfile.findMany({
      where: { groupId },
      include: {
        user: { select: { username: true } },
        submissions: {
          select: {
            taskId: true,
            band: true,
            submittedAt: true,
          },
        },
      },
    });

    const leaderboard = students.map((student) => {
      const taskBestMap = new Map<string, number>();
      for (const s of student.submissions) {
        const cur = taskBestMap.get(s.taskId) ?? 0;
        if (s.band > cur) {
          taskBestMap.set(s.taskId, s.band);
        }
      }
      const testsTaken = taskBestMap.size;
      const bestScores = Array.from(taskBestMap.values());
      const averageBand =
        testsTaken > 0
          ? Number(
              (
                bestScores.reduce((acc, b) => acc + b, 0) /
                testsTaken
              ).toFixed(1),
            )
          : 0;
      const bestBand =
        student.submissions.length > 0
          ? Math.max(...student.submissions.map((s) => s.band))
          : 0;
      const lastActive =
        student.submissions.length > 0
          ? [...student.submissions].sort(
              (a, b) =>
                new Date(b.submittedAt).getTime() -
                new Date(a.submittedAt).getTime(),
            )[0].submittedAt
          : null;

      return {
        studentId: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        username: student.user?.username || '',
        testsTaken,
        averageBand,
        bestBand,
        lastActive,
      };
    });

    return leaderboard.sort((a, b) => {
      if (b.averageBand !== a.averageBand) {
        return b.averageBand - a.averageBand;
      }
      if (b.bestBand !== a.bestBand) {
        return b.bestBand - a.bestBand;
      }
      return b.testsTaken - a.testsTaken;
    });
  }
}
