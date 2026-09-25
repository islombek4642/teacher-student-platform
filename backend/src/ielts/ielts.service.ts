import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { IeltsTaskType } from '@prisma/client';

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
      throw new Error('Fayl topilmadi');
    }

    let contentHtml = htmlFile.buffer.toString('utf-8');

    // Remove Telegram links
    contentHtml = contentHtml.replace(
      /<a[^>]*class=["']telegram-link["'][^>]*>.*?<\/a>/g,
      `<button onclick="window.parent.postMessage({type: 'CLOSE_IELTS_TASK'}, '*')" class="telegram-link" style="border:none; cursor:pointer; font-family:inherit;">Chiqish</button>`,
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
      throw new NotFoundException('Topshiriq topilmadi');
    }
    return task;
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
