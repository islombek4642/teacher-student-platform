import { Test, TestingModule } from '@nestjs/testing';
import { IeltsService, detectIeltsTaskType, extractTaskTitle } from './ielts.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { IeltsTaskType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
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
});
