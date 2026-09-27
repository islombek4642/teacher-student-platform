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
    ieltsTask: {
      create: jest.fn(),
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

    it('should return UNKNOWN when neither audio nor reading markers exist', () => {
      const html = '<html><body>Generic content without markers</body></html>';
      expect(detectIeltsTaskType(html)).toBe('UNKNOWN');
    });
  });

  describe('extractTaskTitle', () => {
    it('should extract reading passage title with test number', () => {
      const html = '<html><body><p class="passage-title">Wood: a valuable resource</p></body></html>';
      expect(extractTaskTitle(html, '01_Reading.html')).toBe('Test 1: Wood: a valuable resource');
    });

    it('should extract listening centered title with test number', () => {
      const html = '<html><body><p class="centered-title">Poppy Reserve in Sandcastle</p></body></html>';
      expect(extractTaskTitle(html, '02_Listening.html')).toBe('Test 2: Poppy Reserve in Sandcastle');
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
  });
});
