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

export const IELTS_EXIT_BUTTON_HTML = `<button type="button" class="ielts-exit-btn" onclick="window.parent.postMessage({type: 'CLOSE_IELTS_TASK'}, '*')" style="display:inline-flex; align-items:center; justify-content:center; padding:7px 14px; border:none; border-radius:6px; background-color:#ef4444; color:white; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; gap:6px; transition:background-color 0.2s; box-shadow:0 1px 2px rgba(0,0,0,0.05);" onmouseover="this.style.backgroundColor='#dc2626'" onmouseout="this.style.backgroundColor='#ef4444'">
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
  Exit
</button>`;

export const IELTS_HEADER_FIX_STYLES = `<style id="ielts-header-fix">
  .header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    height: 60px !important;
    padding: 0 20px !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 100 !important;
    background-color: #ffffff !important;
    box-sizing: border-box !important;
    gap: 12px !important;
    border-bottom: 1px solid #e5e7eb !important;
    white-space: nowrap !important;
  }
  .header-zone {
    display: flex !important;
    align-items: center !important;
  }
  .header-left-zone {
    justify-content: flex-start !important;
    flex: 1 1 0% !important;
    min-width: 0 !important;
    gap: 10px !important;
  }
  .header-center-zone {
    justify-content: center !important;
    flex: 0 0 auto !important;
    gap: 10px !important;
  }
  .header-right-zone {
    justify-content: flex-end !important;
    flex: 1 1 0% !important;
    min-width: 0 !important;
    gap: 10px !important;
  }
  .header-tools {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    margin: 0 !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  .header-tool-btn {
    display: inline-flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    width: 42px !important;
    height: 36px !important;
    border: 1px solid #d5d9e0 !important;
    border-radius: 8px !important;
    background: #ffffff !important;
    cursor: pointer !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 !important;
    flex-shrink: 0 !important;
    transition: background 0.15s, border-color 0.15s !important;
  }
  .header-tool-btn:hover {
    background: #f3f4f6 !important;
    border-color: #9ca3af !important;
  }
  .header-tool-btn svg {
    width: 18px !important;
    height: 18px !important;
    fill: #1f2937 !important;
    display: block !important;
  }
  .part-indicator, .timer-container {
    margin: 0 !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }
  .ielts-exit-btn {
    flex-shrink: 0 !important;
  }
  .ielts-preview-badge {
    flex-shrink: 0 !important;
  }

  body.theme-dark .header {
    background-color: #26282d !important;
    border-color: #3a3d43 !important;
  }
  body.theme-dark .header-tool-btn {
    background: #26282d !important;
    border-color: #4b5057 !important;
  }
  body.theme-dark .header-tool-btn svg {
    fill: #e5e7eb !important;
  }
  body.theme-dark .ielts-preview-badge {
    background-color: #1e293b !important;
    color: #60a5fa !important;
    border-color: #2563eb !important;
  }

  /* Mobile Responsive adjustments (phones <= 640px) */
  @media (max-width: 640px) {
    .header {
      padding: 0 8px !important;
      gap: 6px !important;
    }
    .header-left-zone {
      gap: 4px !important;
    }
    .header-center-zone {
      gap: 6px !important;
    }
    .header-right-zone {
      gap: 4px !important;
    }
    .header-tools {
      gap: 4px !important;
    }
    .header-tool-btn {
      width: 34px !important;
      height: 32px !important;
      border-radius: 6px !important;
    }
    .header-tool-btn svg {
      width: 16px !important;
      height: 16px !important;
    }
    .ielts-exit-btn {
      padding: 5px 9px !important;
      font-size: 11px !important;
      gap: 4px !important;
      border-radius: 5px !important;
    }
    .ielts-exit-btn svg {
      width: 13px !important;
      height: 13px !important;
    }
    .ielts-preview-badge {
      padding: 4px 7px !important;
      font-size: 11px !important;
      gap: 4px !important;
      border-radius: 5px !important;
    }
    .ielts-preview-badge svg {
      width: 13px !important;
      height: 13px !important;
    }
    .timer-container, .part-indicator {
      font-size: 12px !important;
    }
  }

  /* Extra Small Mobile (phones <= 420px) */
  @media (max-width: 420px) {
    .header {
      padding: 0 4px !important;
      gap: 4px !important;
    }
    .header-center-zone {
      gap: 4px !important;
    }
    .header-tools {
      gap: 3px !important;
    }
    .header-tool-btn {
      width: 30px !important;
      height: 28px !important;
    }
    .header-tool-btn svg {
      width: 14px !important;
      height: 14px !important;
    }
    .ielts-exit-btn {
      padding: 4px 7px !important;
      font-size: 10.5px !important;
    }
    .ielts-preview-badge {
      padding: 3px 5px !important;
      font-size: 10px !important;
    }
  }
</style>
`;

export function normalizeIeltsHeader(contentHtml: string, isPreview?: boolean): string {
  const previewBadgeHtml = isPreview
    ? `<span class="ielts-preview-badge" style="display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:6px; background-color:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; font-family:inherit; font-size:12px; font-weight:700; user-select:none; white-space:nowrap;">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        Review Mode
      </span>`
    : '';

  const centerZoneHtml = `<div class="header-zone header-center-zone">\n      ${IELTS_EXIT_BUTTON_HTML}\n      ${previewBadgeHtml}\n    </div>`;

  const headerRegex = /<div class=["']header["']>([\s\S]*?)<\/div>\s*(?=<div class=["'](?:audio-player-container|main-container)["'])/i;
  const match = contentHtml.match(headerRegex);
  if (!match) {
    return contentHtml;
  }

  const innerHtml = match[1];
  const partMatch = innerHtml.match(/<div class=["']part-indicator["'][\s\S]*?<\/div>/i);
  const timerMatch = innerHtml.match(/<div class=["']timer-container["'][\s\S]*?<\/div>/i);

  let leftContent = '';
  if (partMatch) {
    leftContent += partMatch[0];
  }
  if (timerMatch && !leftContent.includes('timer-container')) {
    leftContent += (leftContent ? ' ' : '') + timerMatch[0];
  }

  // Preserve existing tools ONLY if they were present in the original task HTML
  const toolsMatch = innerHtml.match(/<div class=["']header-tools["'][\s\S]*?<\/div>/i);
  const rightContent = toolsMatch ? toolsMatch[0] : '';

  const leftZoneHtml = `<div class="header-zone header-left-zone">${leftContent}</div>`;
  const rightZoneHtml = `<div class="header-zone header-right-zone">${rightContent}</div>`;

  const newHeaderHtml = `<div class="header">\n    ${leftZoneHtml}\n    ${centerZoneHtml}\n    ${rightZoneHtml}\n  </div>`;

  return contentHtml.replace(headerRegex, newHeaderHtml);
}

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

export const IELTS_REVIEW_MODE_SCRIPT = `<script>
  (function() {
    function lockInputs() {
      document.querySelectorAll('input, select, textarea').forEach(function(el) {
        el.disabled = true;
      });
      var deliverBtn = document.getElementById('deliver-button');
      if (deliverBtn) {
        deliverBtn.style.display = 'none';
      }
      var submitBtns = document.querySelectorAll('button[type="submit"], .submit-button, .check-button');
      submitBtns.forEach(function(b) {
        b.style.display = 'none';
      });
    }

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', lockInputs);
    } else {
      lockInputs();
    }

    var checkTimer = setInterval(function() {
      lockInputs();
      if (typeof window.checkAnswers === 'function') {
        try {
          window.checkAnswers();
        } catch(e) {}
        lockInputs();
        clearInterval(checkTimer);
      }
    }, 100);

    setTimeout(function() {
      clearInterval(checkTimer);
      lockInputs();
    }, 3000);
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

  async getTask(id: string, mode?: string, preview?: boolean) {
    const task = await this.prisma.ieltsTask.findUnique({
      where: { id },
    });
    if (!task) {
      throw new NotFoundException({
        errorCode: ERROR_CODES.TASK_NOT_FOUND,
        message: 'Task not found',
      });
    }

    // 1. Structure the header cleanly into 3 distinct zones (Left, Center Exit/Badge, Right Tools)
    task.contentHtml = normalizeIeltsHeader(task.contentHtml, preview);

    // 2. Also strip any inline confirm() calls anywhere
    task.contentHtml = task.contentHtml.replace(
      /if\s*\(\s*confirm\s*\([^)]*\)\s*\)\s*/gi,
      '',
    );

    // 3. Strip any stray telegram links or legacy exit buttons outside header
    task.contentHtml = task.contentHtml.replace(
      /<a\b[^>]*href=["'][^"']*t\.me[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
      '',
    );

    // 4. Inject escape key listener script if not already present
    if (!task.contentHtml.includes('ESCAPE_PRESSED')) {
      task.contentHtml = task.contentHtml.replace('</body>', `${IELTS_ESC_LISTENER_SCRIPT}</body>`);
      if (!task.contentHtml.includes('ESCAPE_PRESSED')) {
        task.contentHtml += IELTS_ESC_LISTENER_SCRIPT;
      }
    }

    // 5. Ensure header fix styles are injected
    task.contentHtml = task.contentHtml.replace(
      /<style id=["']ielts-header-fix["']>[\s\S]*?<\/style>/gi,
      '',
    );
    if (task.contentHtml.includes('</head>')) {
      task.contentHtml = task.contentHtml.replace('</head>', `${IELTS_HEADER_FIX_STYLES}</head>`);
    } else {
      task.contentHtml = IELTS_HEADER_FIX_STYLES + task.contentHtml;
    }

    // 6. Clean up any leftover synthetic scripts if previously cached
    task.contentHtml = task.contentHtml.replace(
      /<script id=["']ielts-tools-runtime["']>[\s\S]*?<\/script>/gi,
      '',
    );

    // 8. Always inject latest submission postMessage hook or review script
    task.contentHtml = task.contentHtml.replace(
      /<script>[\s\S]*?IELTS_TEST_SUBMITTED[\s\S]*?<\/script>/gi,
      '',
    );
    task.contentHtml = task.contentHtml.replace(
      /<script>[\s\S]*?IELTS_REVIEW_MODE[\s\S]*?<\/script>/gi,
      '',
    );

    if (mode === 'review') {
      task.contentHtml += IELTS_REVIEW_MODE_SCRIPT;
    } else {
      task.contentHtml += IELTS_SUBMISSION_SCRIPT;
    }

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
    });

    if (!student || !student.groupId) {
      return [];
    }

    return this.prisma.ieltsTask.findMany({
      where: {
        groupId: student.groupId,
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

    if (task.groupId !== studentProfile.groupId) {
      throw new ForbiddenException({
        errorCode: ERROR_CODES.FORBIDDEN_RESOURCE,
        message: 'This task is not assigned to your group',
      });
    }

    const total = dto.total ?? 40;
    const lastSubmission = await this.prisma.ieltsSubmission.findFirst({
      where: {
        studentId: studentProfile.id,
        taskId,
      },
      orderBy: { attempt: 'desc' },
    });
    const attempt = lastSubmission ? lastSubmission.attempt + 1 : 1;

    const submission = await this.prisma.ieltsSubmission.create({
      data: {
        studentId: studentProfile.id,
        taskId,
        score: dto.score,
        total,
        band: dto.band,
        attempt,
        answersJson: dto.results,
      },
    });

    return {
      id: submission.id,
      taskId: submission.taskId,
      score: submission.score,
      total: submission.total,
      band: submission.band,
      attempt: submission.attempt,
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

    return this.prisma.ieltsSubmission.findFirst({
      where: {
        studentId: studentProfile.id,
        taskId,
      },
      orderBy: { attempt: 'desc' },
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

  async getTaskAttempts(user: JwtPayload, taskId: string) {
    const studentProfile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.sub },
    });
    if (!studentProfile) {
      return [];
    }

    return this.prisma.ieltsSubmission.findMany({
      where: {
        studentId: studentProfile.id,
        taskId,
      },
      select: {
        id: true,
        taskId: true,
        score: true,
        total: true,
        band: true,
        attempt: true,
        submittedAt: true,
        answersJson: true,
      },
      orderBy: { attempt: 'asc' },
    });
  }
}
