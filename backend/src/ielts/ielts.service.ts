import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { IeltsTaskType, Role } from '@prisma/client';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { JwtPayload } from '../auth/jwt-payload.interface';

export const IELTS_EXIT_BUTTON_HTML = `<button onclick="window.parent.postMessage({type: 'CLOSE_IELTS_TASK'}, '*')" style="display:inline-flex; align-items:center; justify-content:center; padding:8px 16px; border:none; border-radius:6px; background-color:#ef4444; color:white; font-family:inherit; font-weight:500; cursor:pointer; gap:8px;">
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
  Exit
</button>`;


@Injectable()
export class IeltsService {
  constructor(private prisma: PrismaService) {}

  async uploadTask(
    user: JwtPayload,
    title: string,
    type: IeltsTaskType,
    htmlFile: Express.Multer.File,
    groupId?: string,
  ) {
    if (!htmlFile || !htmlFile.buffer) {
      throw new BadRequestException({
        errorCode: ERROR_CODES.VALIDATION_FAILED,
        message: 'File is required',
      });
    }

    let teacherId = user.profileId;
    if (!teacherId) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.sub },
      });
      teacherId = teacherProfile?.id ?? null;
    }

    if (!teacherId) {
      const anyTeacher = await this.prisma.teacherProfile.findFirst();
      if (!anyTeacher) {
        throw new BadRequestException({
          errorCode: ERROR_CODES.TEACHER_NOT_FOUND,
          message: 'Teacher profile required to associate task',
        });
      }
      teacherId = anyTeacher.id;
    }

    let contentHtml = htmlFile.buffer.toString('utf-8');

    // Remove any telegram links or replace all <a> tags with the exit button
    contentHtml = contentHtml.replace(
      /<a\b[^>]*>([\s\S]*?)<\/a>/gi,
      IELTS_EXIT_BUTTON_HTML,
    );

    // Remove watermark/promo texts if present
    contentHtml = contentHtml.replace(/@MINDLESS_WRITER/g, '');

    const task = await this.prisma.ieltsTask.create({
      data: {
        title,
        type,
        contentHtml,
        teacherId,
        groupId,
      },
    });

    return { id: task.id, title: task.title, type: task.type };
  }

  async getTask(id: string) {
    const task = await this.prisma.ieltsTask.findUnique({
      where: { id },
    });
    if (!task) {
      throw new NotFoundException({
        errorCode: ERROR_CODES.TASK_NOT_FOUND,
        message: 'Task not found',
      });
    }

    // Dynamically replace ANY existing exit button (including legacy with confirm())
    task.contentHtml = task.contentHtml.replace(
      /<button[^>]*onclick=["'][^"']*CLOSE_IELTS_TASK[^"']*["'][\s\S]*?<\/button>/gi,
      IELTS_EXIT_BUTTON_HTML,
    );

    // Also replace any remaining <a> tags
    task.contentHtml = task.contentHtml.replace(
      /<a\b[^>]*>([\s\S]*?)<\/a>/gi,
      IELTS_EXIT_BUTTON_HTML,
    );

    return task;
  }

  async deleteTask(id: string, user: JwtPayload) {
    const task = await this.prisma.ieltsTask.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException({
        errorCode: ERROR_CODES.TASK_NOT_FOUND,
        message: 'Task not found',
      });
    }

    if (user.role === Role.TEACHER) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { userId: user.sub },
      });
      if (!teacherProfile || task.teacherId !== teacherProfile.id) {
        throw new ForbiddenException({
          errorCode: ERROR_CODES.FORBIDDEN_RESOURCE,
          message: 'You cannot delete this task',
        });
      }
    } else if (user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException({
        errorCode: ERROR_CODES.FORBIDDEN_RESOURCE,
        message: 'Forbidden',
      });
    }

    await this.prisma.ieltsTask.delete({ where: { id } });
    return { success: true };
  }

  async getTasksByGroup(groupId: string) {
    return this.prisma.ieltsTask.findMany({
      where: { groupId },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTasksForTeacherUser(userId: string) {
    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacherProfile) {
      return [];
    }
    return this.getTasksByTeacher(teacherProfile.id);
  }

  async getTasksByTeacher(teacherId: string) {
    return this.prisma.ieltsTask.findMany({
      where: { teacherId },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTasksByStudent(userId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      include: {
        group: true,
      },
    });

    if (!student) {
      return [];
    }

    return this.prisma.ieltsTask.findMany({
      where: {
        OR: [
          { groupId: student.groupId },
          ...(student.group?.teacherId
            ? [{ teacherId: student.group.teacherId, groupId: null }]
            : []),
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllTasks() {
    return this.prisma.ieltsTask.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
