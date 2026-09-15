# Teacher-Student Platform — Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NestJS + PostgreSQL/Prisma backend REST API for the teacher-student task platform: auth, teacher/group/student management, task authoring, auto-graded submissions, and statistics — each behind role-based access control.

**Architecture:** One NestJS module per domain concern (auth, teachers, groups, students, tasks, submissions, statistics), each with its own controller/service/DTOs, talking to PostgreSQL through a single shared `PrismaService`. Cross-cutting concerns (roles, error codes, exception formatting) live in `common/`. All access control uses a `RolesGuard` for role checks plus service-layer ownership filtering (queries scoped to the caller's own `teacherId`/`studentId`) for data isolation between teachers.

**Tech Stack:** NestJS 10 (TypeScript), PostgreSQL 16 (via Docker Compose), Prisma 5, `@nestjs/jwt` + `passport-jwt` for auth, `bcrypt` for password hashing, `class-validator`/`class-transformer` for DTOs, Jest + `ts-jest` for unit tests, Jest + `supertest` against a real test database for integration tests.

**Spec:** [docs/superpowers/specs/2026-09-15-teacher-student-platform-design.md](../specs/2026-09-15-teacher-student-platform-design.md)

## Global Constraints

- Roles are exactly three string values: `SUPER_ADMIN`, `TEACHER`, `STUDENT` (spec §2).
- SUPER_ADMIN manages teacher accounts only; never touches groups/students/tasks/statistics (spec §2).
- TEACHER and STUDENT access is always scoped to their own data — a teacher never reads another teacher's groups/students/tasks, a student never reads another student's submissions (spec §2, §6).
- The backend never returns user-facing text — only stable `errorCode` strings from a single constants file; `message` fields are English technical strings for logs only, never rendered by a client (spec §7, §8).
- All request input is validated with `class-validator` DTOs at the controller boundary (spec §8).
- A student belongs to exactly one group (spec §5, MVP constraint).
- `MULTIPLE_CHOICE` questions have exactly one correct option — single-select (spec §5).
- `FILL_BLANK` grading is case-insensitive and trims whitespace before comparing to `correctAnswer` (spec §6).
- Student account passwords are randomly generated 4 digits, bcrypt-hashed at rest, and returned as plaintext exactly once — in the creation response (spec §6).
- Unit tests mock the data layer; integration tests run against a real (test) PostgreSQL database and exercise full controller → service → DB flows, including cross-tenant access denial (spec §9).
- Test files are colocated with source as `*.spec.ts`, except integration tests, which follow Nest's own convention of a top-level `test/` directory with `*.e2e-spec.ts` files (this plan's one deviation from strict colocation, needed because e2e tests boot the whole app rather than one unit).

---

## File Structure

```
backend/
  docker-compose.yml
  .env.example
  package.json
  tsconfig.json
  nest-cli.json
  prisma/
    schema.prisma
    seed.ts
  src/
    main.ts
    app.module.ts
    app.controller.ts
    common/
      constants/
        roles.constant.ts
        question-types.constant.ts
        error-codes.constant.ts
        subjects.constant.ts
      decorators/
        roles.decorator.ts
      guards/
        roles.guard.ts
      filters/
        http-exception.filter.ts
      prisma/
        prisma.service.ts
        prisma.module.ts
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      jwt-payload.interface.ts
      strategies/jwt.strategy.ts
      guards/jwt-auth.guard.ts
      decorators/current-user.decorator.ts
      dto/login.dto.ts
      password.util.ts
    teachers/
      teachers.module.ts
      teachers.controller.ts
      teachers.service.ts
      dto/create-teacher.dto.ts
    groups/
      groups.module.ts
      groups.controller.ts
      groups.service.ts
      dto/create-group.dto.ts
    students/
      students.module.ts
      students.controller.ts
      students.service.ts
      dto/create-student.dto.ts
    tasks/
      tasks.module.ts
      tasks.controller.ts
      tasks.service.ts
      dto/create-task.dto.ts
      dto/create-question.dto.ts
    submissions/
      submissions.module.ts
      submissions.controller.ts
      submissions.service.ts
      grading.util.ts
      dto/submit-answers.dto.ts
    statistics/
      statistics.module.ts
      statistics.controller.ts
      statistics.service.ts
  test/
    jest-e2e.json
    utils/test-app.ts
    auth.e2e-spec.ts
    teachers.e2e-spec.ts
    groups.e2e-spec.ts
    students.e2e-spec.ts
    tasks.e2e-spec.ts
    submissions.e2e-spec.ts
    statistics.e2e-spec.ts
```

---

### Task 1: Project Scaffolding & Health Check

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/nest-cli.json`
- Create: `backend/.env.example`
- Create: `backend/src/main.ts`
- Create: `backend/src/app.module.ts`
- Create: `backend/src/app.controller.ts`
- Test: `backend/src/app.controller.spec.ts`

**Interfaces:**
- Produces: `AppModule` (root module later tasks add their module to via `imports: []`), `GET /health` → `{ status: 'ok' }`

- [ ] **Step 1: Create `backend/package.json`**

```json
{
  "name": "backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start:dev": "nest start --watch",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json --runInBand",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^3.2.3",
    "@nestjs/core": "^10.4.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.0",
    "@prisma/client": "^5.19.1",
    "bcrypt": "^5.1.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.5",
    "@nestjs/testing": "^10.4.0",
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^5.19.1",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.4"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd backend && npm install`
Expected: installs succeed, `node_modules/` and `package-lock.json` created.

- [ ] **Step 3: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": false,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "esModuleInterop": true
  }
}
```

- [ ] **Step 4: Create `backend/nest-cli.json`**

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src"
}
```

- [ ] **Step 5: Create `backend/.env.example`**

```
DATABASE_URL=postgresql://app:app@localhost:5432/teacher_student
DATABASE_URL_TEST=postgresql://app:app@localhost:5433/teacher_student_test
JWT_SECRET=change-me-in-real-env
JWT_EXPIRES_IN=8h
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_PASSWORD=change-me-in-real-env
PORT=3000
```

- [ ] **Step 6: Write the failing test for the health endpoint**

`backend/src/app.controller.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  it('getHealth returns ok status', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    const controller = moduleRef.get(AppController);
    expect(controller.getHealth()).toEqual({ status: 'ok' });
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd backend && npm test -- app.controller.spec.ts`
Expected: FAIL — `Cannot find module './app.controller'`

- [ ] **Step 8: Implement `backend/src/app.controller.ts`, `backend/src/app.module.ts`, `backend/src/main.ts`**

`backend/src/app.controller.ts`:

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class AppController {
  getHealth() {
    return { status: 'ok' };
  }

  @Get()
  handleGet() {
    return this.getHealth();
  }
}
```

`backend/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
})
export class AppModule {}
```

`backend/src/main.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd backend && npm test -- app.controller.spec.ts`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add backend/package.json backend/tsconfig.json backend/nest-cli.json backend/.env.example backend/src
git commit -m "chore: scaffold NestJS backend with health check"
```

---

### Task 2: PostgreSQL, Prisma Schema & Seed Data

**Files:**
- Create: `backend/docker-compose.yml`
- Create: `backend/prisma/schema.prisma`
- Create: `backend/prisma/seed.ts`
- Create: `backend/src/common/prisma/prisma.service.ts`
- Create: `backend/src/common/prisma/prisma.module.ts`
- Modify: `backend/src/app.module.ts` (import `PrismaModule`)
- Test: `backend/src/common/prisma/prisma.service.spec.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: Prisma models `User`, `TeacherProfile`, `StudentProfile`, `Group`, `Subject`, `Task`, `Question`, `Submission`, `Answer`; enums `Role` (`SUPER_ADMIN`|`TEACHER`|`STUDENT`), `QuestionType` (`MULTIPLE_CHOICE`|`FILL_BLANK`), `SubmissionStatus` (`IN_PROGRESS`|`COMPLETED`); `PrismaService` (injectable, extends `PrismaClient`) exported from `PrismaModule` for all later modules to inject.

- [ ] **Step 1: Create `backend/docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: teacher_student
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  postgres-test:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: teacher_student_test
    ports:
      - "5433:5432"
volumes:
  pgdata:
```

Run: `cd backend && docker compose up -d`
Expected: both `postgres` and `postgres-test` containers running.

- [ ] **Step 2: Create `backend/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  SUPER_ADMIN
  TEACHER
  STUDENT
}

enum QuestionType {
  MULTIPLE_CHOICE
  FILL_BLANK
}

enum SubmissionStatus {
  IN_PROGRESS
  COMPLETED
}

model User {
  id             String          @id @default(uuid())
  username       String          @unique
  passwordHash   String
  role           Role
  isActive       Boolean         @default(true)
  createdAt      DateTime        @default(now())
  teacherProfile TeacherProfile?
  studentProfile StudentProfile?
}

model TeacherProfile {
  id        String   @id @default(uuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  firstName String
  lastName  String
  groups    Group[]
  createdAt DateTime @default(now())
}

model StudentProfile {
  id          String       @id @default(uuid())
  userId      String       @unique
  user        User         @relation(fields: [userId], references: [id])
  firstName   String
  lastName    String
  groupId     String
  group       Group        @relation(fields: [groupId], references: [id])
  submissions Submission[]
  createdAt   DateTime     @default(now())
}

model Group {
  id        String           @id @default(uuid())
  name      String
  teacherId String
  teacher   TeacherProfile   @relation(fields: [teacherId], references: [id])
  students  StudentProfile[]
  tasks     Task[]
  createdAt DateTime         @default(now())
}

model Subject {
  id    String @id @default(uuid())
  code  String @unique
  name  String
  tasks Task[]
}

model Task {
  id          String       @id @default(uuid())
  subjectId   String
  subject     Subject      @relation(fields: [subjectId], references: [id])
  groupId     String
  group       Group        @relation(fields: [groupId], references: [id])
  teacherId   String
  title       String
  description String?
  createdAt   DateTime     @default(now())
  questions   Question[]
  submissions Submission[]
}

model Question {
  id            String       @id @default(uuid())
  taskId        String
  task          Task         @relation(fields: [taskId], references: [id])
  type          QuestionType
  text          String
  options       Json?
  correctAnswer String
  answers       Answer[]
}

model Submission {
  id          String           @id @default(uuid())
  taskId      String
  task        Task             @relation(fields: [taskId], references: [id])
  studentId   String
  student     StudentProfile   @relation(fields: [studentId], references: [id])
  status      SubmissionStatus @default(IN_PROGRESS)
  score       Int              @default(0)
  submittedAt DateTime?
  createdAt   DateTime         @default(now())
  answers     Answer[]

  @@unique([taskId, studentId])
}

model Answer {
  id            String     @id @default(uuid())
  submissionId  String
  submission    Submission @relation(fields: [submissionId], references: [id])
  questionId    String
  question      Question   @relation(fields: [questionId], references: [id])
  studentAnswer String
  isCorrect     Boolean
}
```

`Task.teacherId` duplicates `Task.group.teacherId` deliberately — it lets ownership checks filter tasks with a single indexed column instead of a join.
`Submission` has a unique `(taskId, studentId)` constraint — one attempt per student per task (MVP).

- [ ] **Step 3: Run the initial migration**

Run: `cd backend && cp .env.example .env && npx prisma migrate dev --name init`
Expected: migration created under `prisma/migrations/`, applied to the `teacher_student` database, Prisma Client generated.

- [ ] **Step 4: Create `backend/prisma/seed.ts`**

```ts
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  await prisma.subject.upsert({
    where: { code: 'ENGLISH' },
    update: {},
    create: { code: 'ENGLISH', name: 'English' },
  });

  const username = process.env.SUPER_ADMIN_USERNAME ?? 'superadmin';
  const password = process.env.SUPER_ADMIN_PASSWORD ?? 'changeme';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash, role: Role.SUPER_ADMIN },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Run: `cd backend && npm run prisma:seed`
Expected: seed script logs no errors; `Subject` table has one `ENGLISH` row, `User` table has one `SUPER_ADMIN` row.

- [ ] **Step 5: Write the failing test for `PrismaService`**

`backend/src/common/prisma/prisma.service.spec.ts`:

```ts
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects and disconnects without throwing', async () => {
    const service = new PrismaService();
    await expect(service.onModuleInit()).resolves.not.toThrow();
    await service.$disconnect();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd backend && npm test -- prisma.service.spec.ts`
Expected: FAIL — `Cannot find module './prisma.service'`

- [ ] **Step 7: Implement `PrismaService` and `PrismaModule`**

`backend/src/common/prisma/prisma.service.ts`:

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

`backend/src/common/prisma/prisma.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 8: Wire `PrismaModule` into `AppModule`**

Modify `backend/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd backend && npm test -- prisma.service.spec.ts`
Expected: PASS (requires `postgres` container from Step 1 running)

- [ ] **Step 10: Commit**

```bash
git add backend/docker-compose.yml backend/prisma backend/src/common/prisma backend/src/app.module.ts backend/.env
git commit -m "feat: add Prisma schema, migration, seed data, and PrismaService"
```

---

### Task 3: Common Infrastructure — Constants, Error Filter, Roles Guard

**Files:**
- Create: `backend/src/common/constants/roles.constant.ts`
- Create: `backend/src/common/constants/question-types.constant.ts`
- Create: `backend/src/common/constants/error-codes.constant.ts`
- Create: `backend/src/common/constants/subjects.constant.ts`
- Create: `backend/src/common/filters/http-exception.filter.ts`
- Create: `backend/src/common/decorators/roles.decorator.ts`
- Create: `backend/src/common/guards/roles.guard.ts`
- Modify: `backend/src/main.ts` (register global filter)
- Test: `backend/src/common/filters/http-exception.filter.spec.ts`
- Test: `backend/src/common/guards/roles.guard.spec.ts`

**Interfaces:**
- Consumes: `Role` enum from `@prisma/client` (Task 2)
- Produces: `ERROR_CODES` object (e.g. `ERROR_CODES.INVALID_CREDENTIALS === 'ERR_INVALID_CREDENTIALS'`), `Roles(...roles: Role[])` decorator (sets reflector metadata key `'roles'`), `RolesGuard` (reads `request.user.role`, allows if no `@Roles()` metadata present or role is in the list), `AppException` — thrown as `new AppException(errorCode, httpStatus, message)` — and `HttpExceptionFilter` normalizing every thrown `HttpException`/`AppException` to `{ statusCode, errorCode, message }`.

- [ ] **Step 1: Create the constants files**

`backend/src/common/constants/roles.constant.ts`:

```ts
export { Role } from '@prisma/client';
```

`backend/src/common/constants/question-types.constant.ts`:

```ts
export { QuestionType } from '@prisma/client';
```

`backend/src/common/constants/subjects.constant.ts`:

```ts
export const SUBJECT_CODES = {
  ENGLISH: 'ENGLISH',
} as const;
```

`backend/src/common/constants/error-codes.constant.ts`:

```ts
export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'ERR_INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'ERR_USER_NOT_FOUND',
  TEACHER_NOT_FOUND: 'ERR_TEACHER_NOT_FOUND',
  GROUP_NOT_FOUND: 'ERR_GROUP_NOT_FOUND',
  STUDENT_NOT_FOUND: 'ERR_STUDENT_NOT_FOUND',
  TASK_NOT_FOUND: 'ERR_TASK_NOT_FOUND',
  SUBJECT_NOT_FOUND: 'ERR_SUBJECT_NOT_FOUND',
  SUBMISSION_NOT_FOUND: 'ERR_SUBMISSION_NOT_FOUND',
  SUBMISSION_ALREADY_COMPLETED: 'ERR_SUBMISSION_ALREADY_COMPLETED',
  FORBIDDEN_RESOURCE: 'ERR_FORBIDDEN_RESOURCE',
  VALIDATION_FAILED: 'ERR_VALIDATION_FAILED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
```

- [ ] **Step 2: Write the failing test for `HttpExceptionFilter`**

`backend/src/common/filters/http-exception.filter.spec.ts`:

```ts
import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ERROR_CODES } from '../constants/error-codes.constant';

function buildHost(jsonMock: jest.Mock) {
  const response = { status: jest.fn().mockReturnThis(), json: jsonMock };
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/test' }),
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  it('normalizes an exception with an errorCode payload', () => {
    const filter = new HttpExceptionFilter();
    const json = jest.fn();
    const exception = new BadRequestException({
      errorCode: ERROR_CODES.VALIDATION_FAILED,
      message: 'username must not be empty',
    });

    filter.catch(exception, buildHost(json));

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errorCode: ERROR_CODES.VALIDATION_FAILED,
      }),
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && npm test -- http-exception.filter.spec.ts`
Expected: FAIL — `Cannot find module './http-exception.filter'`

- [ ] **Step 4: Implement `HttpExceptionFilter`**

`backend/src/common/filters/http-exception.filter.ts`:

```ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODES } from '../constants/error-codes.constant';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const errorCode =
      typeof body === 'object' && body !== null && 'errorCode' in body
        ? (body as { errorCode: string }).errorCode
        : ERROR_CODES.VALIDATION_FAILED;

    const message =
      exception instanceof Error ? exception.message : 'Unexpected error';

    response.status(statusCode).json({ statusCode, errorCode, message });
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && npm test -- http-exception.filter.spec.ts`
Expected: PASS

- [ ] **Step 6: Register the filter globally**

Modify `backend/src/main.ts`:

```ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 7: Write the failing test for `RolesGuard`**

`backend/src/common/guards/roles.guard.spec.ts`:

```ts
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function buildContext(role: Role | undefined) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('denies access when the user role is not in the required list', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Role.TEACHER]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext(Role.STUDENT))).toBe(false);
  });

  it('allows access when the user role is in the required list', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([Role.TEACHER]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext(Role.TEACHER))).toBe(true);
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `cd backend && npm test -- roles.guard.spec.ts`
Expected: FAIL — `Cannot find module './roles.guard'`

- [ ] **Step 9: Implement `Roles` decorator and `RolesGuard`**

`backend/src/common/decorators/roles.decorator.ts`:

```ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

`backend/src/common/guards/roles.guard.ts`:

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    return !!user && requiredRoles.includes(user.role);
  }
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `cd backend && npm test -- roles.guard.spec.ts`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add backend/src/common backend/src/main.ts
git commit -m "feat: add error codes, exception filter, and roles guard"
```

---

### Task 4: Password Utility (Random Generation + Hashing)

**Files:**
- Create: `backend/src/auth/password.util.ts`
- Test: `backend/src/auth/password.util.spec.ts`

**Interfaces:**
- Produces: `generateFourDigitPassword(): string` (always 4 digits, zero-padded), `hashPassword(plain: string): Promise<string>`, `comparePassword(plain: string, hash: string): Promise<boolean>`

- [ ] **Step 1: Write the failing tests**

`backend/src/auth/password.util.spec.ts`:

```ts
import { comparePassword, generateFourDigitPassword, hashPassword } from './password.util';

describe('password.util', () => {
  it('generates a zero-padded 4-digit password', () => {
    for (let i = 0; i < 50; i++) {
      const password = generateFourDigitPassword();
      expect(password).toMatch(/^\d{4}$/);
    }
  });

  it('hashes a password and verifies it correctly', async () => {
    const hash = await hashPassword('1234');
    expect(hash).not.toEqual('1234');
    await expect(comparePassword('1234', hash)).resolves.toBe(true);
    await expect(comparePassword('9999', hash)).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- password.util.spec.ts`
Expected: FAIL — `Cannot find module './password.util'`

- [ ] **Step 3: Implement `password.util.ts`**

```ts
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export function generateFourDigitPassword(): string {
  return randomInt(0, 10000).toString().padStart(4, '0');
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test -- password.util.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/password.util.ts backend/src/auth/password.util.spec.ts
git commit -m "feat: add password generation and hashing utility"
```

---

### Task 5: Auth Module (JWT Login)

**Files:**
- Create: `backend/src/auth/jwt-payload.interface.ts`
- Create: `backend/src/auth/dto/login.dto.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/strategies/jwt.strategy.ts`
- Create: `backend/src/auth/guards/jwt-auth.guard.ts`
- Create: `backend/src/auth/decorators/current-user.decorator.ts`
- Create: `backend/src/auth/auth.module.ts`
- Modify: `backend/src/app.module.ts` (import `AuthModule`)
- Test: `backend/src/auth/auth.service.spec.ts`
- Test: `backend/test/auth.e2e-spec.ts` (integration)
- Create: `backend/test/jest-e2e.json`
- Create: `backend/test/utils/test-app.ts`

**Interfaces:**
- Consumes: `PrismaService` (Task 2), `comparePassword` (Task 4), `ERROR_CODES` (Task 3)
- Produces: `JwtPayload { sub: string; role: Role; profileId: string | null }`, `AuthService.validateUser(username, password): Promise<JwtPayload>`, `AuthService.login(payload): { accessToken: string }`, `POST /auth/login` → `{ accessToken: string }`, `JwtAuthGuard`, `@CurrentUser()` decorator returning `JwtPayload` from `request.user`

- [ ] **Step 1: Create `backend/test/jest-e2e.json`**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

- [ ] **Step 2: Create `backend/test/utils/test-app.ts`**

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { PrismaService } from '../../src/common/prisma/prisma.service';

export async function createTestApp(): Promise<{ app: INestApplication; prisma: PrismaService }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
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
```

Note: integration tests run with `DATABASE_URL` pointed at the test database — set `DATABASE_URL=$DATABASE_URL_TEST` in the environment before `npm run test:e2e` (documented in Task 5 Step 12).

- [ ] **Step 3: Write the failing unit test for `AuthService`**

`backend/src/auth/auth.service.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { hashPassword } from './password.util';

describe('AuthService', () => {
  it('validateUser returns a JwtPayload for correct credentials', async () => {
    const passwordHash = await hashPassword('1234');
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          username: 'student1',
          passwordHash,
          role: Role.STUDENT,
          isActive: true,
          studentProfile: { id: 'profile-1' },
          teacherProfile: null,
        }),
      },
    } as unknown as PrismaService;
    const jwtService = { sign: jest.fn().mockReturnValue('signed-token') } as unknown as JwtService;
    const service = new AuthService(prisma, jwtService);

    const payload = await service.validateUser('student1', '1234');

    expect(payload).toEqual({ sub: 'user-1', role: Role.STUDENT, profileId: 'profile-1' });
  });

  it('validateUser rejects an incorrect password', async () => {
    const passwordHash = await hashPassword('1234');
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          username: 'student1',
          passwordHash,
          role: Role.STUDENT,
          isActive: true,
          studentProfile: { id: 'profile-1' },
          teacherProfile: null,
        }),
      },
    } as unknown as PrismaService;
    const jwtService = { sign: jest.fn() } as unknown as JwtService;
    const service = new AuthService(prisma, jwtService);

    await expect(service.validateUser('student1', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd backend && npm test -- auth.service.spec.ts`
Expected: FAIL — `Cannot find module './auth.service'`

- [ ] **Step 5: Implement `JwtPayload`, `LoginDto`, and `AuthService`**

`backend/src/auth/jwt-payload.interface.ts`:

```ts
import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: Role;
  profileId: string | null;
}
```

`backend/src/auth/dto/login.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
```

`backend/src/auth/auth.service.ts`:

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { comparePassword } from './password.util';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<JwtPayload> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { teacherProfile: true, studentProfile: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid username or password',
      });
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid username or password',
      });
    }

    const profileId = user.teacherProfile?.id ?? user.studentProfile?.id ?? null;
    return { sub: user.id, role: user.role, profileId };
  }

  login(payload: JwtPayload): { accessToken: string } {
    return { accessToken: this.jwtService.sign(payload) };
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && npm test -- auth.service.spec.ts`
Expected: PASS

- [ ] **Step 7: Implement `JwtStrategy`, `JwtAuthGuard`, `CurrentUser`, `AuthController`, `AuthModule`**

`backend/src/auth/strategies/jwt.strategy.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'change-me-in-real-env',
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
```

`backend/src/auth/guards/jwt-auth.guard.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`backend/src/auth/decorators/current-user.decorator.ts`:

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../jwt-payload.interface';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): JwtPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
```

`backend/src/auth/auth.controller.ts`:

```ts
import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const payload = await this.authService.validateUser(dto.username, dto.password);
    return this.authService.login(payload);
  }
}
```

`backend/src/auth/auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 8: Wire `AuthModule` into `AppModule`**

Modify `backend/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule],
  controllers: [AppController],
})
export class AppModule {}
```

- [ ] **Step 9: Write the failing integration test**

`backend/test/auth.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Role } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

describe('POST /auth/login (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns an access token for valid credentials', async () => {
    const passwordHash = await hashPassword('1234');
    await prisma.user.create({
      data: { username: 'teacher1', passwordHash, role: Role.TEACHER },
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'teacher1', password: '1234' });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  it('rejects invalid credentials with ERR_INVALID_CREDENTIALS', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'nobody', password: 'wrong' });

    expect(response.status).toBe(401);
    expect(response.body.errorCode).toBe('ERR_INVALID_CREDENTIALS');
  });
});
```

- [ ] **Step 10: Run integration test to verify it fails**

Run: `cd backend && DATABASE_URL=$DATABASE_URL_TEST npx prisma migrate deploy && DATABASE_URL=$DATABASE_URL_TEST npm run test:e2e -- auth.e2e-spec.ts`
Expected: FAIL initially if `AuthModule`/`AppModule` wiring is incomplete; once Steps 1-8 are in place it should compile and run against the test DB.

- [ ] **Step 11: Run integration test to verify it passes**

Run: `cd backend && DATABASE_URL=$DATABASE_URL_TEST npm run test:e2e -- auth.e2e-spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 12: Commit**

```bash
git add backend/src/auth backend/src/app.module.ts backend/test
git commit -m "feat: add JWT login flow with unit and integration tests"
```

---

### Task 6: Teachers Module (Super Admin Only)

**Files:**
- Create: `backend/src/teachers/dto/create-teacher.dto.ts`
- Create: `backend/src/teachers/teachers.service.ts`
- Create: `backend/src/teachers/teachers.controller.ts`
- Create: `backend/src/teachers/teachers.module.ts`
- Modify: `backend/src/app.module.ts` (import `TeachersModule`)
- Test: `backend/src/teachers/teachers.service.spec.ts`
- Test: `backend/test/teachers.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `generateFourDigitPassword`/`hashPassword` (Task 4), `Roles` decorator + `RolesGuard` (Task 3), `JwtAuthGuard`/`CurrentUser` (Task 5)
- Produces: `TeachersService.create(dto): Promise<{ id, username, firstName, lastName, temporaryPassword }>`, `POST /teachers` (SUPER_ADMIN only) → same shape, `GET /teachers` (SUPER_ADMIN only) → list without password fields

- [ ] **Step 1: Write the failing unit test**

`backend/src/teachers/teachers.service.spec.ts`:

```ts
import { Role } from '@prisma/client';
import { TeachersService } from './teachers.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('TeachersService', () => {
  it('creates a teacher user + profile and returns a one-time plaintext password', async () => {
    const prisma = {
      $transaction: jest.fn(async (fn: any) =>
        fn({
          user: { create: jest.fn().mockResolvedValue({ id: 'user-1', username: 'teacher.ali' }) },
          teacherProfile: {
            create: jest.fn().mockResolvedValue({ id: 'profile-1', firstName: 'Ali', lastName: 'Vali' }),
          },
        }),
      ),
    } as unknown as PrismaService;
    const service = new TeachersService(prisma);

    const result = await service.create({ username: 'teacher.ali', firstName: 'Ali', lastName: 'Vali' });

    expect(result.username).toBe('teacher.ali');
    expect(result.temporaryPassword).toMatch(/^\d{4}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- teachers.service.spec.ts`
Expected: FAIL — `Cannot find module './teachers.service'`

- [ ] **Step 3: Implement `CreateTeacherDto` and `TeachersService`**

`backend/src/teachers/dto/create-teacher.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;
}
```

`backend/src/teachers/teachers.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { generateFourDigitPassword, hashPassword } from '../auth/password.util';
import { CreateTeacherDto } from './dto/create-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTeacherDto) {
    const temporaryPassword = generateFourDigitPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const { user, profile } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username: dto.username, passwordHash, role: Role.TEACHER },
      });
      const profile = await tx.teacherProfile.create({
        data: { userId: user.id, firstName: dto.firstName, lastName: dto.lastName },
      });
      return { user, profile };
    });

    return {
      id: profile.id,
      username: user.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      temporaryPassword,
    };
  }

  async findAll() {
    const teachers = await this.prisma.teacherProfile.findMany({
      include: { user: { select: { username: true, isActive: true } } },
    });
    return teachers.map((t) => ({
      id: t.id,
      username: t.user.username,
      firstName: t.firstName,
      lastName: t.lastName,
      isActive: t.user.isActive,
    }));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- teachers.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Implement `TeachersController` and `TeachersModule`**

`backend/src/teachers/teachers.controller.ts`:

```ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  create(@Body() dto: CreateTeacherDto) {
    return this.teachersService.create(dto);
  }

  @Get()
  findAll() {
    return this.teachersService.findAll();
  }
}
```

`backend/src/teachers/teachers.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';

@Module({
  controllers: [TeachersController],
  providers: [TeachersService],
})
export class TeachersModule {}
```

- [ ] **Step 6: Wire `TeachersModule` into `AppModule`**

Modify `backend/src/app.module.ts` — add `TeachersModule` to the `imports` array (alongside `PrismaModule`, `AuthModule`) and import it at the top of the file.

- [ ] **Step 7: Write the failing integration test**

`backend/test/teachers.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Role } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';
import { JwtService } from '@nestjs/jwt';

describe('Teachers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    jwtService = app.get(JwtService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets a SUPER_ADMIN create a teacher and returns a one-time password', async () => {
    const passwordHash = await hashPassword('0000');
    const admin = await prisma.user.create({
      data: { username: 'admin1', passwordHash, role: Role.SUPER_ADMIN },
    });
    const token = jwtService.sign({ sub: admin.id, role: Role.SUPER_ADMIN, profileId: null });

    const response = await request(app.getHttpServer())
      .post('/teachers')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'teacher.ali', firstName: 'Ali', lastName: 'Vali' });

    expect(response.status).toBe(201);
    expect(response.body.temporaryPassword).toMatch(/^\d{4}$/);
  });

  it('rejects a TEACHER trying to create another teacher', async () => {
    const passwordHash = await hashPassword('0000');
    const teacherUser = await prisma.user.create({
      data: { username: 'teacher0', passwordHash, role: Role.TEACHER },
    });
    const profile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, firstName: 'A', lastName: 'B' },
    });
    const token = jwtService.sign({ sub: teacherUser.id, role: Role.TEACHER, profileId: profile.id });

    const response = await request(app.getHttpServer())
      .post('/teachers')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'teacher.ali', firstName: 'Ali', lastName: 'Vali' });

    expect(response.status).toBe(403);
  });
});
```

- [ ] **Step 8: Run integration test to verify it fails, then implement wiring from Steps 5-6 if missing, then verify it passes**

Run: `cd backend && DATABASE_URL=$DATABASE_URL_TEST npm run test:e2e -- teachers.e2e-spec.ts`
Expected: PASS (2 tests) once Steps 1-6 are complete.

- [ ] **Step 9: Commit**

```bash
git add backend/src/teachers backend/src/app.module.ts backend/test/teachers.e2e-spec.ts
git commit -m "feat: add teachers module with super-admin-only access"
```

---

### Task 7: Groups Module (Teacher-Owned)

**Files:**
- Create: `backend/src/groups/dto/create-group.dto.ts`
- Create: `backend/src/groups/groups.service.ts`
- Create: `backend/src/groups/groups.controller.ts`
- Create: `backend/src/groups/groups.module.ts`
- Modify: `backend/src/app.module.ts` (import `GroupsModule`)
- Test: `backend/src/groups/groups.service.spec.ts`
- Test: `backend/test/groups.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `Roles`/`RolesGuard`, `JwtAuthGuard`/`CurrentUser`, `JwtPayload`
- Produces: `GroupsService.create(teacherProfileId, dto)`, `GroupsService.findAllForTeacher(teacherProfileId)`, `GroupsService.findOneOwned(teacherProfileId, groupId)` (throws `NotFoundException` with `ERR_GROUP_NOT_FOUND` if the group doesn't exist or belongs to another teacher — later tasks reuse this exact ownership pattern), `POST /groups`, `GET /groups` (TEACHER only, scoped to caller)

- [ ] **Step 1: Write the failing unit test**

`backend/src/groups/groups.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('GroupsService', () => {
  it('creates a group owned by the given teacher', async () => {
    const prisma = {
      group: { create: jest.fn().mockResolvedValue({ id: 'g1', name: '9-A', teacherId: 't1' }) },
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    const result = await service.create('t1', { name: '9-A' });

    expect(prisma.group.create).toHaveBeenCalledWith({ data: { name: '9-A', teacherId: 't1' } });
    expect(result.id).toBe('g1');
  });

  it('findOneOwned throws NotFoundException when the group belongs to another teacher', async () => {
    const prisma = {
      group: { findUnique: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 'other-teacher' }) },
    } as unknown as PrismaService;
    const service = new GroupsService(prisma);

    await expect(service.findOneOwned('t1', 'g1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- groups.service.spec.ts`
Expected: FAIL — `Cannot find module './groups.service'`

- [ ] **Step 3: Implement `CreateGroupDto` and `GroupsService`**

`backend/src/groups/dto/create-group.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
```

`backend/src/groups/groups.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  create(teacherProfileId: string, dto: CreateGroupDto) {
    return this.prisma.group.create({ data: { name: dto.name, teacherId: teacherProfileId } });
  }

  findAllForTeacher(teacherProfileId: string) {
    return this.prisma.group.findMany({ where: { teacherId: teacherProfileId } });
  }

  async findOneOwned(teacherProfileId: string, groupId: string) {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group || group.teacherId !== teacherProfileId) {
      throw new NotFoundException({ errorCode: ERROR_CODES.GROUP_NOT_FOUND, message: 'Group not found' });
    }
    return group;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- groups.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Implement `GroupsController` and `GroupsModule`**

`backend/src/groups/groups.controller.ts`:

```ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.profileId!, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.groupsService.findAllForTeacher(user.profileId!);
  }
}
```

`backend/src/groups/groups.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

@Module({
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
```

- [ ] **Step 6: Wire `GroupsModule` into `AppModule`**

Modify `backend/src/app.module.ts` — add `GroupsModule` to imports.

- [ ] **Step 7: Write the failing integration test**

`backend/test/groups.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

async function createTeacher(prisma: PrismaService, username: string) {
  const passwordHash = await hashPassword('0000');
  const user = await prisma.user.create({ data: { username, passwordHash, role: Role.TEACHER } });
  const profile = await prisma.teacherProfile.create({
    data: { userId: user.id, firstName: 'T', lastName: username },
  });
  return { user, profile };
}

describe('Groups (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    jwtService = app.get(JwtService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets a teacher create and list only their own groups', async () => {
    const teacherA = await createTeacher(prisma, 'teacherA');
    const teacherB = await createTeacher(prisma, 'teacherB');
    const tokenA = jwtService.sign({ sub: teacherA.user.id, role: Role.TEACHER, profileId: teacherA.profile.id });
    const tokenB = jwtService.sign({ sub: teacherB.user.id, role: Role.TEACHER, profileId: teacherB.profile.id });

    await request(app.getHttpServer())
      .post('/groups')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: '9-A' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/groups')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: '9-B' })
      .expect(201);

    const listA = await request(app.getHttpServer())
      .get('/groups')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(listA.body).toHaveLength(1);
    expect(listA.body[0].name).toBe('9-A');
  });
});
```

- [ ] **Step 8: Run integration test to verify it passes**

Run: `cd backend && DATABASE_URL=$DATABASE_URL_TEST npm run test:e2e -- groups.e2e-spec.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add backend/src/groups backend/src/app.module.ts backend/test/groups.e2e-spec.ts
git commit -m "feat: add groups module scoped to owning teacher"
```

---

### Task 8: Students Module (Auto-Generated Password)

**Files:**
- Create: `backend/src/students/dto/create-student.dto.ts`
- Create: `backend/src/students/students.service.ts`
- Create: `backend/src/students/students.controller.ts`
- Create: `backend/src/students/students.module.ts`
- Modify: `backend/src/app.module.ts` (import `StudentsModule`)
- Test: `backend/src/students/students.service.spec.ts`
- Test: `backend/test/students.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `GroupsService.findOneOwned` (Task 7, imported via `GroupsModule` export), `generateFourDigitPassword`/`hashPassword` (Task 4)
- Produces: `StudentsService.create(teacherProfileId, groupId, dto): Promise<{ id, username, firstName, lastName, temporaryPassword }>`, `POST /groups/:groupId/students`, `GET /groups/:groupId/students` (TEACHER only, group must belong to caller)

- [ ] **Step 1: Write the failing unit test**

`backend/src/students/students.service.spec.ts`:

```ts
import { StudentsService } from './students.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';

describe('StudentsService', () => {
  it('creates a student inside a group the teacher owns, with a one-time password', async () => {
    const groupsService = {
      findOneOwned: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
    } as unknown as GroupsService;
    const prisma = {
      $transaction: jest.fn(async (fn: any) =>
        fn({
          user: { create: jest.fn().mockResolvedValue({ id: 'user-1', username: 'student.anvar' }) },
          studentProfile: {
            create: jest
              .fn()
              .mockResolvedValue({ id: 'profile-1', firstName: 'Anvar', lastName: 'Qodirov', groupId: 'g1' }),
          },
        }),
      ),
    } as unknown as PrismaService;
    const service = new StudentsService(prisma, groupsService);

    const result = await service.create('t1', 'g1', {
      username: 'student.anvar',
      firstName: 'Anvar',
      lastName: 'Qodirov',
    });

    expect(groupsService.findOneOwned).toHaveBeenCalledWith('t1', 'g1');
    expect(result.temporaryPassword).toMatch(/^\d{4}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- students.service.spec.ts`
Expected: FAIL — `Cannot find module './students.service'`

- [ ] **Step 3: Implement `CreateStudentDto` and `StudentsService`**

`backend/src/students/dto/create-student.dto.ts`:

```ts
import { IsString, MinLength } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;
}
```

`backend/src/students/students.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { generateFourDigitPassword, hashPassword } from '../auth/password.util';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  async create(teacherProfileId: string, groupId: string, dto: CreateStudentDto) {
    await this.groupsService.findOneOwned(teacherProfileId, groupId);

    const temporaryPassword = generateFourDigitPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const { user, profile } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username: dto.username, passwordHash, role: Role.STUDENT },
      });
      const profile = await tx.studentProfile.create({
        data: { userId: user.id, firstName: dto.firstName, lastName: dto.lastName, groupId },
      });
      return { user, profile };
    });

    return {
      id: profile.id,
      username: user.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      temporaryPassword,
    };
  }

  async findAllInGroup(teacherProfileId: string, groupId: string) {
    await this.groupsService.findOneOwned(teacherProfileId, groupId);
    const students = await this.prisma.studentProfile.findMany({
      where: { groupId },
      include: { user: { select: { username: true, isActive: true } } },
    });
    return students.map((s) => ({
      id: s.id,
      username: s.user.username,
      firstName: s.firstName,
      lastName: s.lastName,
    }));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- students.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Implement `StudentsController` and `StudentsModule`**

`backend/src/students/students.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER)
@Controller('groups/:groupId/students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(user.profileId!, groupId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string) {
    return this.studentsService.findAllInGroup(user.profileId!, groupId);
  }
}
```

`backend/src/students/students.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [GroupsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
```

- [ ] **Step 6: Wire `StudentsModule` into `AppModule`**

Modify `backend/src/app.module.ts` — add `StudentsModule` to imports.

- [ ] **Step 7: Write the failing integration test**

`backend/test/students.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

async function createTeacherWithGroup(prisma: PrismaService, username: string, groupName: string) {
  const passwordHash = await hashPassword('0000');
  const user = await prisma.user.create({ data: { username, passwordHash, role: Role.TEACHER } });
  const profile = await prisma.teacherProfile.create({
    data: { userId: user.id, firstName: 'T', lastName: username },
  });
  const group = await prisma.group.create({ data: { name: groupName, teacherId: profile.id } });
  return { user, profile, group };
}

describe('Students (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    jwtService = app.get(JwtService);
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a student in the caller own group and returns a one-time password', async () => {
    const teacher = await createTeacherWithGroup(prisma, 'teacherA', '9-A');
    const token = jwtService.sign({ sub: teacher.user.id, role: Role.TEACHER, profileId: teacher.profile.id });

    const response = await request(app.getHttpServer())
      .post(`/groups/${teacher.group.id}/students`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'student.anvar', firstName: 'Anvar', lastName: 'Qodirov' });

    expect(response.status).toBe(201);
    expect(response.body.temporaryPassword).toMatch(/^\d{4}$/);
  });

  it("rejects adding a student to another teacher's group", async () => {
    const owner = await createTeacherWithGroup(prisma, 'teacherOwner', '9-A');
    const intruder = await createTeacherWithGroup(prisma, 'teacherIntruder', '9-B');
    const intruderToken = jwtService.sign({
      sub: intruder.user.id,
      role: Role.TEACHER,
      profileId: intruder.profile.id,
    });

    const response = await request(app.getHttpServer())
      .post(`/groups/${owner.group.id}/students`)
      .set('Authorization', `Bearer ${intruderToken}`)
      .send({ username: 'student.anvar', firstName: 'Anvar', lastName: 'Qodirov' });

    expect(response.status).toBe(404);
    expect(response.body.errorCode).toBe('ERR_GROUP_NOT_FOUND');
  });
});
```

- [ ] **Step 8: Run integration test to verify it passes**

Run: `cd backend && DATABASE_URL=$DATABASE_URL_TEST npm run test:e2e -- students.e2e-spec.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add backend/src/students backend/src/app.module.ts backend/test/students.e2e-spec.ts
git commit -m "feat: add students module with per-group ownership checks"
```

---

### Task 9: Tasks & Questions Module

**Files:**
- Create: `backend/src/tasks/dto/create-question.dto.ts`
- Create: `backend/src/tasks/dto/create-task.dto.ts`
- Create: `backend/src/tasks/tasks.service.ts`
- Create: `backend/src/tasks/tasks.controller.ts`
- Create: `backend/src/tasks/tasks.module.ts`
- Modify: `backend/src/app.module.ts` (import `TasksModule`)
- Test: `backend/src/tasks/tasks.service.spec.ts`
- Test: `backend/test/tasks.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `GroupsService.findOneOwned` (Task 7), `SUBJECT_CODES` (Task 3)
- Produces: `TasksService.create(teacherProfileId, dto): Promise<Task & { questions: Question[] }>`, `TasksService.findOneOwned(teacherProfileId, taskId)` (throws `ERR_TASK_NOT_FOUND`, reused by Task 11), `TasksService.findAllForGroup(teacherProfileId, groupId)`, `TasksService.findAssignedToStudent(studentGroupId): Promise<Task[]>` (no answer/correctAnswer fields exposed to students), `POST /tasks` (TEACHER), `GET /groups/:groupId/tasks` (TEACHER), `GET /tasks/assigned` (STUDENT)

- [ ] **Step 1: Write the failing unit test**

`backend/src/tasks/tasks.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { TasksService } from './tasks.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';

describe('TasksService', () => {
  it('creates a task with questions inside a group the teacher owns', async () => {
    const groupsService = {
      findOneOwned: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
    } as unknown as GroupsService;
    const prisma = {
      task: {
        create: jest.fn().mockResolvedValue({
          id: 'task-1',
          title: 'Present Simple',
          questions: [{ id: 'q1', type: QuestionType.FILL_BLANK }],
        }),
      },
    } as unknown as PrismaService;
    const service = new TasksService(prisma, groupsService);

    const result = await service.create('t1', {
      subjectCode: 'ENGLISH',
      groupId: 'g1',
      title: 'Present Simple',
      description: null,
      questions: [{ type: QuestionType.FILL_BLANK, text: 'He ___ to school.', correctAnswer: 'goes' }],
    });

    expect(groupsService.findOneOwned).toHaveBeenCalledWith('t1', 'g1');
    expect(result.id).toBe('task-1');
  });

  it('findOneOwned throws NotFoundException for a task belonging to another teacher', async () => {
    const groupsService = {} as unknown as GroupsService;
    const prisma = {
      task: { findUnique: jest.fn().mockResolvedValue({ id: 'task-1', teacherId: 'other' }) },
    } as unknown as PrismaService;
    const service = new TasksService(prisma, groupsService);

    await expect(service.findOneOwned('t1', 'task-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- tasks.service.spec.ts`
Expected: FAIL — `Cannot find module './tasks.service'`

- [ ] **Step 3: Implement DTOs and `TasksService`**

`backend/src/tasks/dto/create-question.dto.ts`:

```ts
import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { QuestionType } from '@prisma/client';

export class CreateQuestionDto {
  @IsEnum(QuestionType)
  type!: QuestionType;

  @IsString()
  @MinLength(1)
  text!: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsString()
  @MinLength(1)
  correctAnswer!: string;
}
```

`backend/src/tasks/dto/create-task.dto.ts`:

```ts
import { ArrayMinSize, IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionDto } from './create-question.dto';

export class CreateTaskDto {
  @IsString()
  subjectCode!: string;

  @IsString()
  groupId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  questions!: CreateQuestionDto[];
}
```

`backend/src/tasks/tasks.service.ts`:

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { GroupsService } from '../groups/groups.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  async create(teacherProfileId: string, dto: CreateTaskDto) {
    await this.groupsService.findOneOwned(teacherProfileId, dto.groupId);
    const subject = await this.prisma.subject.findUnique({ where: { code: dto.subjectCode } });
    if (!subject) {
      throw new NotFoundException({ errorCode: ERROR_CODES.SUBJECT_NOT_FOUND, message: 'Subject not found' });
    }

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        subjectId: subject.id,
        groupId: dto.groupId,
        teacherId: teacherProfileId,
        questions: {
          create: dto.questions.map((q) => ({
            type: q.type,
            text: q.text,
            options: q.options ?? undefined,
            correctAnswer: q.correctAnswer,
          })),
        },
      },
      include: { questions: true },
    });
  }

  async findOneOwned(teacherProfileId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { questions: true } });
    if (!task || task.teacherId !== teacherProfileId) {
      throw new NotFoundException({ errorCode: ERROR_CODES.TASK_NOT_FOUND, message: 'Task not found' });
    }
    return task;
  }

  async findAllForGroup(teacherProfileId: string, groupId: string) {
    await this.groupsService.findOneOwned(teacherProfileId, groupId);
    return this.prisma.task.findMany({ where: { groupId }, include: { questions: true } });
  }

  async findAssignedToStudent(studentGroupId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { groupId: studentGroupId },
      include: { questions: { select: { id: true, type: true, text: true, options: true } } },
    });
    return tasks;
  }
}
```

Note: `findAssignedToStudent`'s question `select` deliberately omits `correctAnswer` so students never receive answers in the payload.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- tasks.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Implement `TasksController` and `TasksModule`**

`backend/src/tasks/tasks.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { PrismaService } from '../common/prisma/prisma.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles(Role.TEACHER)
  @Post('tasks')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.profileId!, dto);
  }

  @Roles(Role.TEACHER)
  @Get('groups/:groupId/tasks')
  findAllForGroup(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string) {
    return this.tasksService.findAllForGroup(user.profileId!, groupId);
  }

  @Roles(Role.STUDENT)
  @Get('tasks/assigned')
  async findAssigned(@CurrentUser() user: JwtPayload) {
    const profile = await this.prisma.studentProfile.findUniqueOrThrow({ where: { id: user.profileId! } });
    return this.tasksService.findAssignedToStudent(profile.groupId);
  }
}
```

`backend/src/tasks/tasks.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [GroupsModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
```

- [ ] **Step 6: Wire `TasksModule` into `AppModule`**

Modify `backend/src/app.module.ts` — add `TasksModule` to imports.

- [ ] **Step 7: Write the failing integration test**

`backend/test/tasks.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { QuestionType, Role } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    jwtService = app.get(JwtService);
    await prisma.subject.upsert({
      where: { code: 'ENGLISH' },
      update: {},
      create: { code: 'ENGLISH', name: 'English' },
    });
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets a teacher create a task and hides correctAnswer from the student view', async () => {
    const passwordHash = await hashPassword('0000');
    const teacherUser = await prisma.user.create({ data: { username: 't1', passwordHash, role: Role.TEACHER } });
    const teacherProfile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, firstName: 'T', lastName: '1' },
    });
    const group = await prisma.group.create({ data: { name: '9-A', teacherId: teacherProfile.id } });
    const studentUser = await prisma.user.create({ data: { username: 's1', passwordHash, role: Role.STUDENT } });
    const studentProfile = await prisma.studentProfile.create({
      data: { userId: studentUser.id, firstName: 'S', lastName: '1', groupId: group.id },
    });

    const teacherToken = jwtService.sign({
      sub: teacherUser.id,
      role: Role.TEACHER,
      profileId: teacherProfile.id,
    });

    const createResponse = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        subjectCode: 'ENGLISH',
        groupId: group.id,
        title: 'Present Simple',
        questions: [
          { type: QuestionType.FILL_BLANK, text: 'He ___ to school.', correctAnswer: 'goes' },
        ],
      });
    expect(createResponse.status).toBe(201);

    const studentToken = jwtService.sign({
      sub: studentUser.id,
      role: Role.STUDENT,
      profileId: studentProfile.id,
    });

    const assignedResponse = await request(app.getHttpServer())
      .get('/tasks/assigned')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(assignedResponse.status).toBe(200);
    expect(assignedResponse.body[0].questions[0].correctAnswer).toBeUndefined();
  });
});
```

- [ ] **Step 8: Run integration test to verify it passes**

Run: `cd backend && DATABASE_URL=$DATABASE_URL_TEST npm run test:e2e -- tasks.e2e-spec.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add backend/src/tasks backend/src/app.module.ts backend/test/tasks.e2e-spec.ts
git commit -m "feat: add tasks/questions module with answer-hiding for students"
```

---

### Task 10: Grading Utility

**Files:**
- Create: `backend/src/submissions/grading.util.ts`
- Test: `backend/src/submissions/grading.util.spec.ts`

**Interfaces:**
- Consumes: `QuestionType` (Task 3)
- Produces: `gradeAnswer(question: { type: QuestionType; correctAnswer: string }, studentAnswer: string): boolean`

- [ ] **Step 1: Write the failing tests**

`backend/src/submissions/grading.util.spec.ts`:

```ts
import { QuestionType } from '@prisma/client';
import { gradeAnswer } from './grading.util';

describe('gradeAnswer', () => {
  it('marks an exact multiple-choice match as correct', () => {
    expect(gradeAnswer({ type: QuestionType.MULTIPLE_CHOICE, correctAnswer: 'B' }, 'B')).toBe(true);
  });

  it('marks a mismatched multiple-choice answer as incorrect', () => {
    expect(gradeAnswer({ type: QuestionType.MULTIPLE_CHOICE, correctAnswer: 'B' }, 'A')).toBe(false);
  });

  it('marks a fill-blank answer correct regardless of case and surrounding whitespace', () => {
    expect(gradeAnswer({ type: QuestionType.FILL_BLANK, correctAnswer: 'goes' }, '  Goes  ')).toBe(true);
  });

  it('marks a fill-blank answer incorrect when the words differ', () => {
    expect(gradeAnswer({ type: QuestionType.FILL_BLANK, correctAnswer: 'goes' }, 'go')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- grading.util.spec.ts`
Expected: FAIL — `Cannot find module './grading.util'`

- [ ] **Step 3: Implement `grading.util.ts`**

```ts
import { QuestionType } from '@prisma/client';

export function gradeAnswer(
  question: { type: QuestionType; correctAnswer: string },
  studentAnswer: string,
): boolean {
  if (question.type === QuestionType.MULTIPLE_CHOICE) {
    return studentAnswer === question.correctAnswer;
  }
  return studentAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test -- grading.util.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/submissions/grading.util.ts backend/src/submissions/grading.util.spec.ts
git commit -m "feat: add auto-grading comparison utility"
```

---

### Task 11: Submissions Module

**Files:**
- Create: `backend/src/submissions/dto/submit-answers.dto.ts`
- Create: `backend/src/submissions/submissions.service.ts`
- Create: `backend/src/submissions/submissions.controller.ts`
- Create: `backend/src/submissions/submissions.module.ts`
- Modify: `backend/src/app.module.ts` (import `SubmissionsModule`)
- Test: `backend/src/submissions/submissions.service.spec.ts`
- Test: `backend/test/submissions.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `gradeAnswer` (Task 10)
- Produces: `SubmissionsService.submit(studentProfileId, taskId, dto): Promise<{ id, score, status }>` (throws `ERR_TASK_NOT_FOUND` if the task isn't assigned to the student's group, `ERR_SUBMISSION_ALREADY_COMPLETED` on a second attempt), `POST /tasks/:taskId/submit` (STUDENT only)

- [ ] **Step 1: Write the failing unit test**

`backend/src/submissions/submissions.service.spec.ts`:

```ts
import { NotFoundException } from '@nestjs/common';
import { QuestionType, SubmissionStatus } from '@prisma/client';
import { SubmissionsService } from './submissions.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('SubmissionsService', () => {
  it('grades every answer and stores the total score', async () => {
    const prisma = {
      studentProfile: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'student-1', groupId: 'g1' }) },
      task: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'task-1',
          groupId: 'g1',
          questions: [
            { id: 'q1', type: QuestionType.FILL_BLANK, correctAnswer: 'goes' },
            { id: 'q2', type: QuestionType.MULTIPLE_CHOICE, correctAnswer: 'B' },
          ],
        }),
      },
      submission: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'submission-1', score: data.score, status: data.status }),
        ),
      },
    } as unknown as PrismaService;
    const service = new SubmissionsService(prisma);

    const result = await service.submit('student-1', 'task-1', {
      answers: [
        { questionId: 'q1', answer: 'Goes' },
        { questionId: 'q2', answer: 'A' },
      ],
    });

    expect(result.score).toBe(1);
    expect(result.status).toBe(SubmissionStatus.COMPLETED);
  });

  it('rejects submitting a task outside the student own group', async () => {
    const prisma = {
      studentProfile: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'student-1', groupId: 'g1' }) },
      task: { findFirst: jest.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new SubmissionsService(prisma);

    await expect(service.submit('student-1', 'task-1', { answers: [] })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- submissions.service.spec.ts`
Expected: FAIL — `Cannot find module './submissions.service'`

- [ ] **Step 3: Implement `SubmitAnswersDto` and `SubmissionsService`**

`backend/src/submissions/dto/submit-answers.dto.ts`:

```ts
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerEntryDto {
  @IsString()
  questionId!: string;

  @IsString()
  answer!: string;
}

export class SubmitAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerEntryDto)
  answers!: AnswerEntryDto[];
}
```

`backend/src/submissions/submissions.service.ts`:

```ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ERROR_CODES } from '../common/constants/error-codes.constant';
import { gradeAnswer } from './grading.util';
import { SubmitAnswersDto } from './dto/submit-answers.dto';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(studentProfileId: string, taskId: string, dto: SubmitAnswersDto) {
    const student = await this.prisma.studentProfile.findUniqueOrThrow({ where: { id: studentProfileId } });

    const task = await this.prisma.task.findFirst({
      where: { id: taskId, groupId: student.groupId },
      include: { questions: true },
    });
    if (!task) {
      throw new NotFoundException({ errorCode: ERROR_CODES.TASK_NOT_FOUND, message: 'Task not found' });
    }

    const existing = await this.prisma.submission.findUnique({
      where: { taskId_studentId: { taskId, studentId: studentProfileId } },
    });
    if (existing) {
      throw new ConflictException({
        errorCode: ERROR_CODES.SUBMISSION_ALREADY_COMPLETED,
        message: 'Task already submitted',
      });
    }

    const questionsById = new Map(task.questions.map((q) => [q.id, q]));
    let score = 0;
    const answerRecords = dto.answers.map((entry) => {
      const question = questionsById.get(entry.questionId);
      const isCorrect = !!question && gradeAnswer(question, entry.answer);
      if (isCorrect) score += 1;
      return { questionId: entry.questionId, studentAnswer: entry.answer, isCorrect };
    });

    return this.prisma.submission.create({
      data: {
        taskId,
        studentId: studentProfileId,
        status: SubmissionStatus.COMPLETED,
        score,
        submittedAt: new Date(),
        answers: { create: answerRecords },
      },
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- submissions.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Implement `SubmissionsController` and `SubmissionsModule`**

`backend/src/submissions/submissions.controller.ts`:

```ts
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { SubmissionsService } from './submissions.service';
import { SubmitAnswersDto } from './dto/submit-answers.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Controller('tasks/:taskId/submit')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  submit(@CurrentUser() user: JwtPayload, @Param('taskId') taskId: string, @Body() dto: SubmitAnswersDto) {
    return this.submissionsService.submit(user.profileId!, taskId, dto);
  }
}
```

`backend/src/submissions/submissions.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';

@Module({
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
})
export class SubmissionsModule {}
```

- [ ] **Step 6: Wire `SubmissionsModule` into `AppModule`**

Modify `backend/src/app.module.ts` — add `SubmissionsModule` to imports.

- [ ] **Step 7: Write the failing integration test**

`backend/test/submissions.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { QuestionType, Role } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

describe('Submissions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    jwtService = app.get(JwtService);
    await prisma.subject.upsert({
      where: { code: 'ENGLISH' },
      update: {},
      create: { code: 'ENGLISH', name: 'English' },
    });
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('auto-grades a submission and rejects a second attempt on the same task', async () => {
    const passwordHash = await hashPassword('0000');
    const teacherUser = await prisma.user.create({ data: { username: 't1', passwordHash, role: Role.TEACHER } });
    const teacherProfile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, firstName: 'T', lastName: '1' },
    });
    const group = await prisma.group.create({ data: { name: '9-A', teacherId: teacherProfile.id } });
    const subject = await prisma.subject.findUniqueOrThrow({ where: { code: 'ENGLISH' } });
    const task = await prisma.task.create({
      data: {
        title: 'Present Simple',
        subjectId: subject.id,
        groupId: group.id,
        teacherId: teacherProfile.id,
        questions: { create: [{ type: QuestionType.FILL_BLANK, text: 'He ___ to school.', correctAnswer: 'goes' }] },
      },
      include: { questions: true },
    });
    const studentUser = await prisma.user.create({ data: { username: 's1', passwordHash, role: Role.STUDENT } });
    const studentProfile = await prisma.studentProfile.create({
      data: { userId: studentUser.id, firstName: 'S', lastName: '1', groupId: group.id },
    });
    const studentToken = jwtService.sign({
      sub: studentUser.id,
      role: Role.STUDENT,
      profileId: studentProfile.id,
    });

    const submitResponse = await request(app.getHttpServer())
      .post(`/tasks/${task.id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionId: task.questions[0].id, answer: 'Goes' }] });

    expect(submitResponse.status).toBe(201);
    expect(submitResponse.body.score).toBe(1);

    const secondAttempt = await request(app.getHttpServer())
      .post(`/tasks/${task.id}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answers: [{ questionId: task.questions[0].id, answer: 'goes' }] });

    expect(secondAttempt.status).toBe(409);
    expect(secondAttempt.body.errorCode).toBe('ERR_SUBMISSION_ALREADY_COMPLETED');
  });
});
```

- [ ] **Step 8: Run integration test to verify it passes**

Run: `cd backend && DATABASE_URL=$DATABASE_URL_TEST npm run test:e2e -- submissions.e2e-spec.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add backend/src/submissions backend/src/app.module.ts backend/test/submissions.e2e-spec.ts
git commit -m "feat: add submissions module with auto-grading and single-attempt rule"
```

---

### Task 12: Statistics Module

**Files:**
- Create: `backend/src/statistics/statistics.service.ts`
- Create: `backend/src/statistics/statistics.controller.ts`
- Create: `backend/src/statistics/statistics.module.ts`
- Modify: `backend/src/app.module.ts` (import `StatisticsModule`)
- Test: `backend/src/statistics/statistics.service.spec.ts`
- Test: `backend/test/statistics.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `GroupsService.findOneOwned` (Task 7)
- Produces: `StatisticsService.groupOverview(teacherProfileId, groupId): Promise<{ studentCount, averageScore, tasksCompleted }>`, `StatisticsService.leaderboard(teacherProfileId, groupId): Promise<Array<{ studentId, firstName, lastName, totalScore }>>` (sorted descending by `totalScore`), `StatisticsService.taskStats(teacherProfileId, taskId): Promise<{ submissionCount, averageScore, mostMissedQuestionIds: string[] }>`, `StatisticsService.studentProgress(studentProfileId): Promise<{ tasksCompleted, averageScore, lastActivityAt }>`; `GET /groups/:groupId/statistics/overview`, `GET /groups/:groupId/statistics/leaderboard`, `GET /tasks/:taskId/statistics` (TEACHER), `GET /statistics/me` (STUDENT)

- [ ] **Step 1: Write the failing unit test**

`backend/src/statistics/statistics.service.spec.ts`:

```ts
import { StatisticsService } from './statistics.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';

describe('StatisticsService', () => {
  it('leaderboard ranks students by total score, highest first', async () => {
    const groupsService = {
      findOneOwned: jest.fn().mockResolvedValue({ id: 'g1', teacherId: 't1' }),
    } as unknown as GroupsService;
    const prisma = {
      studentProfile: {
        findMany: jest.fn().mockResolvedValue([
          { id: 's1', firstName: 'A', lastName: 'A', submissions: [{ score: 2 }, { score: 3 }] },
          { id: 's2', firstName: 'B', lastName: 'B', submissions: [{ score: 5 }] },
        ]),
      },
    } as unknown as PrismaService;
    const service = new StatisticsService(prisma, groupsService);

    const leaderboard = await service.leaderboard('t1', 'g1');

    expect(leaderboard.map((entry) => entry.studentId)).toEqual(['s2', 's1']);
    expect(leaderboard[0].totalScore).toBe(5);
    expect(leaderboard[1].totalScore).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- statistics.service.spec.ts`
Expected: FAIL — `Cannot find module './statistics.service'`

- [ ] **Step 3: Implement `StatisticsService`**

```ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  async groupOverview(teacherProfileId: string, groupId: string) {
    await this.groupsService.findOneOwned(teacherProfileId, groupId);
    const students = await this.prisma.studentProfile.findMany({
      where: { groupId },
      include: { submissions: { select: { score: true } } },
    });
    const allSubmissions = students.flatMap((s) => s.submissions);
    const averageScore =
      allSubmissions.length === 0
        ? 0
        : allSubmissions.reduce((sum, s) => sum + s.score, 0) / allSubmissions.length;

    return {
      studentCount: students.length,
      averageScore,
      tasksCompleted: allSubmissions.length,
    };
  }

  async leaderboard(teacherProfileId: string, groupId: string) {
    await this.groupsService.findOneOwned(teacherProfileId, groupId);
    const students = await this.prisma.studentProfile.findMany({
      where: { groupId },
      include: { submissions: { select: { score: true } } },
    });

    return students
      .map((s) => ({
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        totalScore: s.submissions.reduce((sum, sub) => sum + sub.score, 0),
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  async taskStats(teacherProfileId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.teacherId !== teacherProfileId) {
      return { submissionCount: 0, averageScore: 0, mostMissedQuestionIds: [] };
    }

    const submissions = await this.prisma.submission.findMany({
      where: { taskId },
      include: { answers: true },
    });
    const submissionCount = submissions.length;
    const averageScore =
      submissionCount === 0 ? 0 : submissions.reduce((sum, s) => sum + s.score, 0) / submissionCount;

    const missCounts = new Map<string, number>();
    for (const submission of submissions) {
      for (const answer of submission.answers) {
        if (!answer.isCorrect) {
          missCounts.set(answer.questionId, (missCounts.get(answer.questionId) ?? 0) + 1);
        }
      }
    }
    const mostMissedQuestionIds = [...missCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([questionId]) => questionId);

    return { submissionCount, averageScore, mostMissedQuestionIds };
  }

  async studentProgress(studentProfileId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { studentId: studentProfileId },
      orderBy: { submittedAt: 'desc' },
    });
    const tasksCompleted = submissions.length;
    const averageScore =
      tasksCompleted === 0 ? 0 : submissions.reduce((sum, s) => sum + s.score, 0) / tasksCompleted;
    const lastActivityAt = submissions[0]?.submittedAt ?? null;

    return { tasksCompleted, averageScore, lastActivityAt };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- statistics.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Implement `StatisticsController` and `StatisticsModule`**

`backend/src/statistics/statistics.controller.ts`:

```ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { StatisticsService } from './statistics.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Roles(Role.TEACHER)
  @Get('groups/:groupId/statistics/overview')
  groupOverview(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string) {
    return this.statisticsService.groupOverview(user.profileId!, groupId);
  }

  @Roles(Role.TEACHER)
  @Get('groups/:groupId/statistics/leaderboard')
  leaderboard(@CurrentUser() user: JwtPayload, @Param('groupId') groupId: string) {
    return this.statisticsService.leaderboard(user.profileId!, groupId);
  }

  @Roles(Role.TEACHER)
  @Get('tasks/:taskId/statistics')
  taskStats(@CurrentUser() user: JwtPayload, @Param('taskId') taskId: string) {
    return this.statisticsService.taskStats(user.profileId!, taskId);
  }

  @Roles(Role.STUDENT)
  @Get('statistics/me')
  myProgress(@CurrentUser() user: JwtPayload) {
    return this.statisticsService.studentProgress(user.profileId!);
  }
}
```

`backend/src/statistics/statistics.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { GroupsModule } from '../groups/groups.module';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [GroupsModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
```

- [ ] **Step 6: Wire `StatisticsModule` into `AppModule`**

Modify `backend/src/app.module.ts` — add `StatisticsModule` to imports. `AppModule` now imports, in order: `ConfigModule`, `PrismaModule`, `AuthModule`, `TeachersModule`, `GroupsModule`, `StudentsModule`, `TasksModule`, `SubmissionsModule`, `StatisticsModule`.

- [ ] **Step 7: Write the failing integration test**

`backend/test/statistics.e2e-spec.ts`:

```ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { QuestionType, Role, SubmissionStatus } from '@prisma/client';
import { createTestApp, resetDatabase } from './utils/test-app';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { hashPassword } from '../src/auth/password.util';

describe('Statistics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    jwtService = app.get(JwtService);
    await prisma.subject.upsert({
      where: { code: 'ENGLISH' },
      update: {},
      create: { code: 'ENGLISH', name: 'English' },
    });
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a leaderboard scoped to the caller own group', async () => {
    const passwordHash = await hashPassword('0000');
    const teacherUser = await prisma.user.create({ data: { username: 't1', passwordHash, role: Role.TEACHER } });
    const teacherProfile = await prisma.teacherProfile.create({
      data: { userId: teacherUser.id, firstName: 'T', lastName: '1' },
    });
    const group = await prisma.group.create({ data: { name: '9-A', teacherId: teacherProfile.id } });
    const subject = await prisma.subject.findUniqueOrThrow({ where: { code: 'ENGLISH' } });
    const task = await prisma.task.create({
      data: {
        title: 'Present Simple',
        subjectId: subject.id,
        groupId: group.id,
        teacherId: teacherProfile.id,
        questions: { create: [{ type: QuestionType.FILL_BLANK, text: 'He ___ to school.', correctAnswer: 'goes' }] },
      },
      include: { questions: true },
    });
    const studentUser = await prisma.user.create({ data: { username: 's1', passwordHash, role: Role.STUDENT } });
    const studentProfile = await prisma.studentProfile.create({
      data: { userId: studentUser.id, firstName: 'Top', lastName: 'Student', groupId: group.id },
    });
    await prisma.submission.create({
      data: {
        taskId: task.id,
        studentId: studentProfile.id,
        status: SubmissionStatus.COMPLETED,
        score: 1,
        submittedAt: new Date(),
        answers: { create: [{ questionId: task.questions[0].id, studentAnswer: 'goes', isCorrect: true }] },
      },
    });

    const teacherToken = jwtService.sign({
      sub: teacherUser.id,
      role: Role.TEACHER,
      profileId: teacherProfile.id,
    });

    const response = await request(app.getHttpServer())
      .get(`/groups/${group.id}/statistics/leaderboard`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({ studentId: studentProfile.id, totalScore: 1 });
  });
});
```

- [ ] **Step 8: Run integration test to verify it passes**

Run: `cd backend && DATABASE_URL=$DATABASE_URL_TEST npm run test:e2e -- statistics.e2e-spec.ts`
Expected: PASS

- [ ] **Step 9: Run the full test suite**

Run: `cd backend && npm test && DATABASE_URL=$DATABASE_URL_TEST npm run test:e2e`
Expected: all unit and integration tests across every module PASS.

- [ ] **Step 10: Commit**

```bash
git add backend/src/statistics backend/src/app.module.ts backend/test/statistics.e2e-spec.ts
git commit -m "feat: add statistics module with group, task, and student aggregations"
```

---

## Self-Review Notes

- **Spec coverage:** §2 roles/RBAC → Tasks 3,5,6,7; §5 data model → Task 2; §6 student creation + one-time password → Task 8; §6 task creation/auto-grading → Tasks 9-11; §7 i18n split (backend returns codes only) → Task 3 (`ERROR_CODES`) enforced throughout; §8 error handling → Task 3; §9 testing strategy → every task pairs a unit spec with an integration e2e spec. Frontend (§3 React, §7 UI translations) is intentionally out of this plan's scope — it is the next plan.
- **Placeholder scan:** no TBD/TODO; every step has runnable code or an exact command.
- **Type consistency:** `JwtPayload` (Task 5) is the single shape threaded through `CurrentUser`, all controllers, and every e2e test's `jwtService.sign(...)` calls. `GroupsService.findOneOwned` (Task 7) is reused verbatim by Students (Task 8), Tasks (Task 9), and Statistics (Task 12). `gradeAnswer` (Task 10) is the only place grading logic exists; Submissions (Task 11) imports it rather than reimplementing comparison logic.
