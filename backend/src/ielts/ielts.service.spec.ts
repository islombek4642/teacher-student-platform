import { Test, TestingModule } from '@nestjs/testing';
import { IeltsService, detectIeltsTaskType, extractTaskTitle, calculateWritingBand } from './ielts.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { IeltsTaskType, Role } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ERROR_CODES } from '../common/constants/error-codes.constant';

describe('IeltsService', () => {
  let service: IeltsService;

  const mockPrisma = {
    teacherProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    ieltsTask: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    ieltsSubmission: {
      create: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IeltsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    mockPrisma.ieltsTask.create.mockResolvedValue({
      id: 't1',
      title: 'Test',
      type: IeltsTaskType.READING,
    });
    service = module.get<IeltsService>(IeltsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectIeltsTaskType', () => {
    it('should detect LISTENING when audio element or mp3 is present', () => {
      const html = '<html><body><audio id="global-audio-player"></audio><div>Questions</div></body></html>';
      expect(detectIeltsTaskType(html)).toBe(IeltsTaskType.LISTENING);
    });

    it('should detect LISTENING when title includes listening', () => {
      const html = '<html><head><title>IELTS CDI Listening Practice</title></head><body>Part 1</body></html>';
      expect(detectIeltsTaskType(html)).toBe(IeltsTaskType.LISTENING);
    });

    it('should detect READING when passage is present', () => {
      const html = '<html><head><title>IELTS CDI Reading Practice</title></head><body>Passage 1 text...</body></html>';
      expect(detectIeltsTaskType(html)).toBe(IeltsTaskType.READING);
    });

    it('should detect READING when part-header-1 and passage panels are present', () => {
      const html = '<html><head><title>IELTS CDI Reading Practice</title></head><body><div id="part-header-1" class="part-header"></div><div class="passage-panel"><div class="reading-passage">Passage 1</div></div></body></html>';
      expect(detectIeltsTaskType(html)).toBe(IeltsTaskType.READING);
    });

    it('should detect WRITING when writing markers or textarea are present', () => {
      const html = '<html><head><title>IELTS Writing Test</title></head><body><div class="writing-part" id="part-1"><textarea id="writingTextarea" class="writing-textarea"></textarea></div></body></html>';
      expect(detectIeltsTaskType(html)).toBe(IeltsTaskType.WRITING);
    });

    it('should detect WRITING when part-header and localStorage part markers exist', () => {
      const html = '<html><body><div id="part-header-1" class="part-header"><p>Part 1</p></div><script>localStorage.getItem("ielts-writing-part-1")</script></body></html>';
      expect(detectIeltsTaskType(html)).toBe(IeltsTaskType.WRITING);
    });

    it('should return UNKNOWN when neither audio, reading nor writing markers exist', () => {
      const html = '<html><body>Generic content without markers</body></html>';
      expect(detectIeltsTaskType(html)).toBe('UNKNOWN');
    });
  });

  describe('extractTaskTitle', () => {
    it('should extract reading passage title directly', () => {
      const html = '<html><body><p class="passage-title">Wood: a valuable resource</p></body></html>';
      expect(extractTaskTitle(html, '01_Reading.html')).toBe('Wood: a valuable resource');
    });

    it('should extract listening centered title directly', () => {
      const html = '<html><body><p class="centered-title">Poppy Reserve in Sandcastle</p></body></html>';
      expect(extractTaskTitle(html, '02_Listening.html')).toBe('Poppy Reserve in Sandcastle');
    });

    it('should fallback to filename if no custom title is found', () => {
      const html = '<html><head><title>IELTS CDI Practice</title></head><body>No special classes</body></html>';
      expect(extractTaskTitle(html, 'Practice_Test_9.html')).toBe('Practice Test 9');
    });
  });

  describe('uploadTask type validation', () => {
    it('should reject when uploading a READING file to a LISTENING task', async () => {
      const readingHtml = '<html><head><title>IELTS CDI Reading Practice</title></head><body>Passage 1</body></html>';
      const file = {
        buffer: Buffer.from(readingHtml, 'utf-8'),
      } as Express.Multer.File;

      const user = { sub: 'u1', profileId: 'tp1', role: 'TEACHER' as any };

      await expect(
        service.uploadTask(user, 'Test', IeltsTaskType.LISTENING, file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when uploading a LISTENING file to a READING task', async () => {
      const listeningHtml = '<html><head><title>IELTS CDI Listening Practice</title></head><body><audio></audio>Part 1</body></html>';
      const file = {
        buffer: Buffer.from(listeningHtml, 'utf-8'),
      } as Express.Multer.File;

      const user = { sub: 'u1', profileId: 'tp1', role: 'TEACHER' as any };

      await expect(
        service.uploadTask(user, 'Test', IeltsTaskType.READING, file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when uploading a WRITING file to a READING task', async () => {
      const writingHtml = '<html><head><title>IELTS Writing Test</title></head><body><div class="writing-part"><textarea class="writing-textarea"></textarea></div></body></html>';
      const file = {
        buffer: Buffer.from(writingHtml, 'utf-8'),
      } as Express.Multer.File;

      const user = { sub: 'u1', profileId: 'tp1', role: 'TEACHER' as any };

      await expect(
        service.uploadTask(user, 'Test', IeltsTaskType.READING, file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when uploading a READING file to a WRITING task', async () => {
      const readingHtml = '<html><head><title>IELTS Reading Test</title></head><body><div class="reading-passage">Passage 1</div></body></html>';
      const file = {
        buffer: Buffer.from(readingHtml, 'utf-8'),
      } as Express.Multer.File;

      const user = { sub: 'u1', profileId: 'tp1', role: 'TEACHER' as any };

      await expect(
        service.uploadTask(user, 'Test', IeltsTaskType.WRITING, file),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when uploading a task whose title already exists in database', async () => {
      const listeningHtml = '<html><head><title>IELTS CDI Listening Practice</title></head><body><audio></audio>Part 1</body></html>';
      const file = {
        buffer: Buffer.from(listeningHtml, 'utf-8'),
      } as Express.Multer.File;

      const user = { sub: 'u1', profileId: 'tp1', role: 'TEACHER' as any };

      mockPrisma.ieltsTask.findFirst.mockResolvedValueOnce({
        id: 'existing-id',
        title: 'Existing Task Title',
        type: IeltsTaskType.LISTENING,
      });

      await expect(
        service.uploadTask(user, 'Existing Task Title', IeltsTaskType.LISTENING, file),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.ieltsTask.findFirst).toHaveBeenCalledWith({
        where: {
          title: { equals: 'Existing Task Title', mode: 'insensitive' },
          type: IeltsTaskType.LISTENING,
        },
      });
    });
  });

  describe('submitTask', () => {
    it('should upsert student submission when student and task exist', async () => {
      const studentUser = { sub: 'u-student', role: 'STUDENT' as any, profileId: 'sp-1' };
      const taskId = 'task-1';
      const dto = {
        score: 32,
        total: 40,
        band: 7.5,
        results: [{ question: 1, userAnswer: 'A', correctAnswer: 'A', isCorrect: true }],
      };

      mockPrisma.ieltsTask.findUnique.mockResolvedValueOnce({ id: taskId, groupId: 'g-1' });
      mockPrisma.studentProfile.findUnique.mockResolvedValueOnce({ id: 'sp-1', userId: 'u-student', groupId: 'g-1' });
      mockPrisma.ieltsSubmission.findFirst.mockResolvedValueOnce(null);
      mockPrisma.ieltsSubmission.create.mockResolvedValueOnce({
        id: 'sub-1',
        studentId: 'sp-1',
        taskId,
        score: 32,
        total: 40,
        band: 7.5,
        attempt: 1,
        answersJson: dto.results,
        submittedAt: new Date('2026-09-30T10:00:00Z'),
      });

      const result = await service.submitTask(studentUser, taskId, dto);
      expect(result).toBeDefined();
      expect(result.score).toBe(32);
      expect(result.band).toBe(7.5);
      expect(result.attempt).toBe(1);
      expect(mockPrisma.ieltsSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            studentId: 'sp-1',
            taskId,
            score: 32,
            attempt: 1,
          }),
        }),
      );
    });

    it('should throw NotFoundException if task does not exist', async () => {
      mockPrisma.ieltsTask.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.submitTask({ sub: 'u1', role: 'STUDENT' as any, profileId: null }, 'missing-task', {
          score: 10,
          total: 40,
          band: 4.0,
          results: [],
        }),
      ).rejects.toThrow();
    });
  });

  describe('Timer and Header Hardening', () => {
    it('should inject timer container when missing from original header', async () => {
      const mockTask = {
        id: 't-timer-1',
        title: 'Reading Task without Timer',
        type: IeltsTaskType.READING,
        contentHtml: '<html><head></head><body><div class="header"><div class="part-indicator">Part 1</div></div><p>Passage</p></body></html>',
      };
      mockPrisma.ieltsTask.findUnique.mockResolvedValueOnce(mockTask);

      const result = await service.getTask('t-timer-1', 'take', false);
      expect(result.contentHtml).toContain('timer-container');
      expect(result.contentHtml).toContain('ielts-exam-timer');
      expect(result.contentHtml).toContain('ielts_exam_start_t-timer-1');
    });

    it('should strip timer controls like pause and reset buttons for students during exams', async () => {
      const htmlWithControls = `<html><head></head><body><div class="header">
        <div class="timer-container">
          <span class="timer-display">60:00</span>
          <div class="timer-controls"><button id="timer-toggle-btn">Pause</button><button id="timer-reset-btn">Reset</button></div>
        </div>
      </div></body></html>`;
      mockPrisma.ieltsTask.findUnique.mockResolvedValueOnce({
        id: 't-timer-2',
        title: 'Task with controls',
        type: IeltsTaskType.READING,
        contentHtml: htmlWithControls,
      });

      const result = await service.getTask('t-timer-2', 'take', false);
      expect(result.contentHtml).not.toContain('timer-controls');
      expect(result.contentHtml).not.toContain('timer-toggle-btn');
      expect(result.contentHtml).not.toContain('timer-reset-btn');
    });

    it('should not inject the running exam timer script in review mode', async () => {
      const mockTask = {
        id: 't-timer-3',
        title: 'Task in review',
        type: IeltsTaskType.READING,
        contentHtml: '<html><head></head><body><div class="header"><div class="timer-container"><span class="timer-display">60:00</span></div></div></body></html>',
      };
      mockPrisma.ieltsTask.findUnique.mockResolvedValueOnce(mockTask);
      mockPrisma.ieltsSubmission.findFirst.mockResolvedValueOnce(null);

      const result = await service.getTask('t-timer-3', 'review', false);
      expect(result.contentHtml).not.toContain('ielts-exam-timer');
    });
  });

  describe('Writing Teacher Review & Grading', () => {
    describe('calculateWritingBand', () => {
      it('should calculate accurate standard IELTS bands with proper rounding', () => {
        // Average 6.0 -> 6.0
        expect(calculateWritingBand(6, 6, 6, 6)).toBe(6.0);
        // Average 6.25 -> rounds up to 6.5
        expect(calculateWritingBand(6.5, 6.5, 6, 6)).toBe(6.5);
        // Average 6.75 -> rounds up to 7.0
        expect(calculateWritingBand(6.5, 7, 6.5, 7)).toBe(7.0);
        // Average 6.125 -> rounds down to 6.0
        expect(calculateWritingBand(6, 6.5, 6, 6)).toBe(6.0);
        // Average 6.375 -> rounds to 6.5
        expect(calculateWritingBand(6, 6.5, 6.5, 6.5)).toBe(6.5);
      });
    });

    describe('gradeSubmission', () => {
      const teacherUser = { sub: 'u-teacher', role: Role.TEACHER, profileId: 'tp-1' };
      const dto = {
        taskResponse: 7.0,
        coherenceCohesion: 6.5,
        lexicalResource: 7.0,
        grammaticalAccuracy: 6.5,
        feedback: 'Good paragraph structure and vocabulary.',
      };

      it('should successfully grade writing submission and calculate band', async () => {
        mockPrisma.ieltsSubmission.findUnique = jest.fn().mockResolvedValueOnce({
          id: 'sub-writing-1',
          studentId: 'sp-1',
          taskId: 't-w1',
          task: { id: 't-w1', teacherId: 'tp-1', type: IeltsTaskType.WRITING },
        });
        mockPrisma.teacherProfile.findUnique = jest.fn().mockResolvedValueOnce({
          id: 'tp-1',
          userId: 'u-teacher',
        });
        mockPrisma.ieltsSubmission.update = jest.fn().mockResolvedValueOnce({
          id: 'sub-writing-1',
          band: 7.0,
          isGraded: true,
          criteriaJson: {
            taskResponse: 7.0,
            coherenceCohesion: 6.5,
            lexicalResource: 7.0,
            grammaticalAccuracy: 6.5,
          },
          feedback: dto.feedback,
          gradedById: 'u-teacher',
        });

        const result = await service.gradeSubmission(teacherUser, 'sub-writing-1', dto);
        expect(result).toBeDefined();
        expect(mockPrisma.ieltsSubmission.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'sub-writing-1' },
            data: expect.objectContaining({
              band: 7.0,
              isGraded: true,
              gradedById: 'u-teacher',
            }),
          }),
        );
      });

      it('should throw ForbiddenException if teacher does not own the task', async () => {
        mockPrisma.ieltsSubmission.findUnique = jest.fn().mockResolvedValueOnce({
          id: 'sub-writing-2',
          studentId: 'sp-1',
          taskId: 't-w2',
          task: { id: 't-w2', teacherId: 'other-tp', type: IeltsTaskType.WRITING },
        });
        mockPrisma.teacherProfile.findUnique = jest.fn().mockResolvedValueOnce({
          id: 'tp-1',
          userId: 'u-teacher',
        });

        await expect(service.gradeSubmission(teacherUser, 'sub-writing-2', dto)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });
  });
});
