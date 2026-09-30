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

export const IELTS_ESC_LISTENER_SCRIPT = `<script>
  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      window.parent.postMessage({ type: 'ESCAPE_PRESSED' }, '*');
    }
  });
</script>`;

export const IELTS_SUBMISSION_SCRIPT = `<script>
  (function() {
    var checkInterval = setInterval(function() {
      if (typeof window.checkAnswers === 'function') {
        var orig = window.checkAnswers;
        window.checkAnswers = function() {
          var res = orig.apply(this, arguments);
          try {
            var curScore = 0;
            var totalQ = 40;
            var curBand = 0;
            var results = [];

            // 1. Extract from #score-summary if rendered ('You scored 28 out of 40 (Band 6.5).')
            var scoreEl = document.getElementById('score-summary');
            if (scoreEl && scoreEl.textContent) {
              var m = scoreEl.textContent.match(/(\\d+)\\s+out of\\s+(\\d+)\\s*\\(Band\\s*([\\d.]+)\\)/i);
              if (m) {
                curScore = parseInt(m[1], 10);
                totalQ = parseInt(m[2], 10);
                curBand = parseFloat(m[3]);
              }
            }

            // 2. Extract detailed question results from #result-details
            var rows = document.querySelectorAll('#result-details table tbody tr');
            if (rows && rows.length > 0) {
              rows.forEach(function(row) {
                var cols = row.querySelectorAll('td');
                if (cols.length >= 4) {
                  var isCorr = cols[3].classList.contains('result-correct') || cols[3].textContent.indexOf('Correct') !== -1;
                  results.push({
                    question: cols[0].textContent.trim(),
                    userAnswer: cols[1].textContent.trim(),
                    correctAnswer: cols[2].textContent.trim(),
                    isCorrect: isCorr
                  });
                }
              });
              if (curScore === 0 && results.length > 0) {
                curScore = results.filter(function(r) { return r.isCorrect; }).length;
                totalQ = results.length;
              }
            }

            // 3. Fallback to counting correct question classes if results table wasn't found
            if (curScore === 0 && document.querySelectorAll('.subQuestion.correct').length > 0) {
              curScore = document.querySelectorAll('.subQuestion.correct').length;
            }

            // Fallback band calculation if curBand is 0 and curScore > 0
            if (curBand === 0 && curScore > 0) {
              var r = curScore;
              if (r >= 39) curBand = 9;
              else if (r >= 37) curBand = 8.5;
              else if (r >= 35) curBand = 8;
              else if (r >= 32) curBand = 7.5;
              else if (r >= 30) curBand = 7;
              else if (r >= 26) curBand = 6.5;
              else if (r >= 23) curBand = 6;
              else if (r >= 18) curBand = 5.5;
              else if (r >= 16) curBand = 5;
              else if (r >= 13) curBand = 4.5;
              else if (r >= 10) curBand = 4;
              else if (r >= 8) curBand = 3.5;
              else if (r >= 6) curBand = 3;
              else if (r >= 4) curBand = 2.5;
              else if (r >= 2) curBand = 2;
              else if (r === 1) curBand = 1.5;
              else curBand = 0;
            }

            window.parent.postMessage({
              type: 'IELTS_TEST_SUBMITTED',
              payload: {
                score: curScore,
                total: totalQ,
                band: curBand,
                results: results
              }
            }, '*');
          } catch(err) {
            console.error('Failed to dispatch IELTS submission message', err);
          }
          return res;
        };
        clearInterval(checkInterval);
      }
    }, 100);
  })();
</script>`;

export function detectIeltsTaskType(contentHtml: string): IeltsTaskType | 'UNKNOWN' {
  const hasAudio =
    /<audio\b/i.test(contentHtml) ||
    /id=["']global-audio-player["']/i.test(contentHtml) ||
    /\.mp3\b/i.test(contentHtml);

  const titleMatch = contentHtml.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].toLowerCase() : '';

  const hasPassage = /passage\s*[1-3]/i.test(contentHtml);
  const hasPart = /part\s*[1-4]/i.test(contentHtml);

  if (hasAudio || title.includes('listening') || (hasPart && !hasPassage)) {
    return IeltsTaskType.LISTENING;
  }
  if (hasPassage || title.includes('reading')) {
    return IeltsTaskType.READING;
  }
  return 'UNKNOWN';
}

export function extractTaskTitle(contentHtml: string, filename?: string): string {
  // 1. Reading passage title
  const passageTitleMatch = contentHtml.match(/class=["']passage-title["'][^>]*>([^<]+)<\/p>/i);
  if (passageTitleMatch && passageTitleMatch[1]?.trim()) {
    return passageTitleMatch[1].trim();
  }

  // 2. Listening centered title
  const centeredTitleMatch = contentHtml.match(/class=["']centered-title["'][^>]*>([^<]+)<\/p>/i);
  if (centeredTitleMatch && centeredTitleMatch[1]?.trim()) {
    return centeredTitleMatch[1].trim();
  }

  // 3. Fallback to <title> tag if not generic
  const titleTag = contentHtml.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  if (titleTag && !/^ielts\s+cdi/i.test(titleTag)) {
    return titleTag;
  }

  // 4. Fallback to clean filename
  if (filename) {
    return filename
      .replace(/\.html?$/i, '')
      .replace(/[_-]/g, ' ')
      .trim();
  }

  return 'New Task';
}

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

    let contentHtml = htmlFile.buffer.toString('utf-8');

    if (!title || !title.trim()) {
      title = extractTaskTitle(contentHtml, htmlFile.originalname);
    }

    const trimmedTitle = title.trim();

    // Check if task with identical title and type already exists in the database
    const existingTask = await this.prisma.ieltsTask.findFirst({
      where: {
        title: { equals: trimmedTitle, mode: 'insensitive' },
        type,
      },
    });

    if (existingTask) {
      throw new BadRequestException({
        errorCode: ERROR_CODES.TASK_ALREADY_EXISTS,
        message: `Task with title "${trimmedTitle}" already exists`,
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

    const detectedType = detectIeltsTaskType(contentHtml);
    if (
      (type === IeltsTaskType.LISTENING && detectedType === IeltsTaskType.READING) ||
      (type === IeltsTaskType.READING && detectedType === IeltsTaskType.LISTENING)
    ) {
      throw new BadRequestException({
        errorCode: ERROR_CODES.TASK_TYPE_MISMATCH,
        message: `Task type mismatch: uploaded file appears to be ${detectedType} but target is ${type}`,
      });
    }

    // Remove any telegram links or replace all <a> tags with the exit button
    contentHtml = contentHtml.replace(
      /<a\b[^>]*>([\s\S]*?)<\/a>/gi,
      IELTS_EXIT_BUTTON_HTML,
    );

    // Remove watermark/promo texts if present
    contentHtml = contentHtml.replace(/@MINDLESS_WRITER/g, '');

    // Remove any inline confirm() calls
    contentHtml = contentHtml.replace(
      /if\s*\(\s*confirm\s*\([^)]*\)\s*\)\s*/gi,
      '',
    );

    // Inject escape key listener script
    if (!contentHtml.includes('ESCAPE_PRESSED')) {
      contentHtml += IELTS_ESC_LISTENER_SCRIPT;
    }

    const task = await this.prisma.ieltsTask.create({
      data: {
        title: trimmedTitle,
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

    // 1. Dynamically replace ANY existing exit button (including legacy with confirm())
    task.contentHtml = task.contentHtml.replace(
      /<button\b[^>]*CLOSE_IELTS_TASK[\s\S]*?<\/button>/gi,
      IELTS_EXIT_BUTTON_HTML,
    );

    // 2. Also strip any inline confirm() calls anywhere
    task.contentHtml = task.contentHtml.replace(
      /if\s*\(\s*confirm\s*\([^)]*\)\s*\)\s*/gi,
      '',
    );

    // 3. Also replace any remaining <a> tags
    task.contentHtml = task.contentHtml.replace(
      /<a\b[^>]*>([\s\S]*?)<\/a>/gi,
      IELTS_EXIT_BUTTON_HTML,
    );

    // 4. Inject escape key listener script if not already present
    if (!task.contentHtml.includes('ESCAPE_PRESSED')) {
      task.contentHtml += IELTS_ESC_LISTENER_SCRIPT;
    }

    // 5. Always inject latest submission postMessage hook
    task.contentHtml = task.contentHtml.replace(
      /<script>[\s\S]*?IELTS_TEST_SUBMITTED[\s\S]*?<\/script>/gi,
      '',
    );
    task.contentHtml += IELTS_SUBMISSION_SCRIPT;

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

  async submitTask(user: JwtPayload, taskId: string, dto: { score: number; total?: number; band: number; results: any[] }) {
    const task = await this.prisma.ieltsTask.findUnique({
      where: { id: taskId },
    });
    if (!task) {
      throw new NotFoundException({
        errorCode: ERROR_CODES.TASK_NOT_FOUND,
        message: 'Task not found',
      });
    }

    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!studentProfile) {
      throw new BadRequestException({
        errorCode: ERROR_CODES.STUDENT_NOT_FOUND,
        message: 'Student profile not found',
      });
    }

    const total = dto.total ?? 40;
    const submission = await this.prisma.ieltsSubmission.upsert({
      where: {
        studentId_taskId: {
          studentId: studentProfile.id,
          taskId,
        },
      },
      update: {
        score: dto.score,
        total,
        band: dto.band,
        answersJson: dto.results,
        submittedAt: new Date(),
      },
      create: {
        studentId: studentProfile.id,
        taskId,
        score: dto.score,
        total,
        band: dto.band,
        answersJson: dto.results,
      },
    });

    return {
      id: submission.id,
      taskId: submission.taskId,
      score: submission.score,
      total: submission.total,
      band: submission.band,
      submittedAt: submission.submittedAt,
    };
  }

  async getMySubmission(user: JwtPayload, taskId: string) {
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!studentProfile) {
      return null;
    }

    return this.prisma.ieltsSubmission.findUnique({
      where: {
        studentId_taskId: {
          studentId: studentProfile.id,
          taskId,
        },
      },
    });
  }

  async getMySubmissions(user: JwtPayload) {
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!studentProfile) {
      return [];
    }

    return this.prisma.ieltsSubmission.findMany({
      where: { studentId: studentProfile.id },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
