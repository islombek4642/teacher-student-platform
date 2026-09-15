import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { ERROR_CODES } from '../../src/common/constants/error-codes.constant';

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          errorCode: ERROR_CODES.VALIDATION_FAILED,
          message: errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; '),
        }),
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  const prisma = moduleRef.get(PrismaService);
  return { app, prisma };
}

export async function resetDatabase(prisma: PrismaService) {
  await prisma.$transaction([
    prisma.answer.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.question.deleteMany(),
    prisma.task.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.group.deleteMany(),
    prisma.teacherProfile.deleteMany(),
    prisma.user.deleteMany({ where: { role: { not: 'SUPER_ADMIN' } } }),
  ]);
}
