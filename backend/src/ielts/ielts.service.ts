import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { IeltsTaskType } from '@prisma/client';

export const IELTS_EXIT_BUTTON_HTML = `<button onclick="if(confirm('Are you sure you want to exit?')) window.parent.postMessage({type: 'CLOSE_IELTS_TASK'}, '*')" style="display:inline-flex; align-items:center; justify-content:center; padding:8px 16px; border:none; border-radius:6px; background-color:#ef4444; color:white; font-family:inherit; font-weight:500; cursor:pointer; gap:8px;">
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
    teacherId: string,
    title: string,
    type: IeltsTaskType,
    htmlFile: Express.Multer.File,
    groupId?: string,
  ) {
    // Basic file validation
    if (!htmlFile || !htmlFile.buffer) {
      throw new Error('ERR_VALIDATION_FAILED');
    }

    let contentHtml = htmlFile.buffer.toString('utf-8');

    // Remove all links and replace them with a styled Exit button
    contentHtml = contentHtml.replace(
      /<a\b[^>]*>([\s\S]*?)<\/a>/gi,
      IELTS_EXIT_BUTTON_HTML,
    );

    // Some texts like @MINDLESS_WRITER can be hidden via CSS or replaced
    // We'll replace it to keep it clean.
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
      throw new NotFoundException('ERR_TASK_NOT_FOUND');
    }

    // Dynamically replace any old 'Chiqish' buttons that might be in the database
    task.contentHtml = task.contentHtml.replace(
      /<button[^>]*onclick=["']window\.parent\.postMessage\(\{type:\s*'CLOSE_IELTS_TASK'\}[\s\S]*?<\/button>/gi,
      IELTS_EXIT_BUTTON_HTML,
    );

    // Also replace any a tags just in case
    task.contentHtml = task.contentHtml.replace(
      /<a\b[^>]*>([\s\S]*?)<\/a>/gi,
      IELTS_EXIT_BUTTON_HTML,
    );

    return task;
  }

  async deleteTask(id: string, teacherId: string) {
    const task = await this.prisma.ieltsTask.findUnique({ where: { id } });
    if (!task || task.teacherId !== teacherId) {
      throw new NotFoundException('ERR_TASK_NOT_FOUND');
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
}
