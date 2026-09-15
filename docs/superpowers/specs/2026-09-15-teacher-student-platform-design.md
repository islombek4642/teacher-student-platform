# Teacher-Student Task Platform — Design Spec

Date: 2026-09-15
Status: Approved (ready for implementation planning)

## 1. Purpose

A web platform where a teacher tracks students who complete subject
tasks (starting with English) through the app. The teacher acts as an
admin with statistics dashboards over their own students' progress.
Built as a Software Quality Assurance coursework project, so clean,
modular, tested code matters as much as the feature set.

## 2. Roles

Three-level hierarchy:

- **SUPER_ADMIN** — creates, disables, and deletes teacher accounts.
  Does not touch groups, students, tasks, or statistics — that is the
  teacher's domain.
- **TEACHER** — creates groups, creates student accounts within their
  groups, creates tasks and questions, views statistics/dashboards
  scoped to their own groups only.
- **STUDENT** — sees tasks assigned to their group, submits answers,
  views their own progress only.

Access control is enforced with a `@Roles()` decorator + `RolesGuard`
for role-level checks, and service-layer ownership checks (e.g. a
teacher's queries are always filtered by their own `teacherId`) for
data-level isolation between teachers.

## 3. Tech Stack

- **Backend**: NestJS (TypeScript)
- **Database**: PostgreSQL, accessed via Prisma
- **Frontend**: React (TypeScript)
- **i18n**: react-i18next, UI in Uzbek and English
- **Auth**: JWT (access token carries `userId` and `role`)
- **Testing**: Jest — unit tests (`@nestjs/testing` with mocked
  repositories) and integration tests (real test PostgreSQL database)

## 4. Module Structure (backend)

One NestJS module per domain concern, each with its own
controller/service/repository (via Prisma)/DTOs:

```
src/
  auth/            # login, JWT strategy, password hashing/verification
  teachers/         # super-admin-only CRUD on teacher accounts
  groups/           # teacher CRUD on their own groups
  students/         # teacher CRUD on students within their groups
  subjects/         # subject lookup (seeded, not hardcoded)
  tasks/             # teacher-authored tasks + questions
  submissions/       # student task attempts, auto-grading
  statistics/        # read-only aggregation queries
  common/
    constants/       # roles, question types, error codes
    guards/          # RolesGuard, ownership guards
    decorators/      # @Roles(), @CurrentUser()
    filters/          # global HttpExceptionFilter
```

## 5. Data Model

| Entity | Key fields | Notes |
|---|---|---|
| `User` | id, username, passwordHash, role, isActive, createdAt | Base auth record |
| `TeacherProfile` | userId (1:1), firstName, lastName | |
| `StudentProfile` | userId (1:1), firstName, lastName, groupId | One student belongs to exactly one group (MVP) |
| `Group` | id, name, teacherId, createdAt | |
| `Subject` | id, code (`ENGLISH`), name | Seeded table, not a hardcoded string — new subjects are new rows, not new code |
| `Task` | id, subjectId, groupId, teacherId, title, description, createdAt | |
| `Question` | id, taskId, type (`MULTIPLE_CHOICE` \| `FILL_BLANK`), text, options (JSON, MC only), correctAnswer | MC questions have exactly one correct option (single-select, not checkboxes) |
| `Submission` | id, taskId, studentId, status (`IN_PROGRESS` \| `COMPLETED`), score, submittedAt | |
| `Answer` | id, submissionId, questionId, studentAnswer, isCorrect | |

## 6. Core Flows

**Creating a student account**
1. Teacher creates a student within one of their groups (name, username).
2. Backend generates a random 4-digit password (`crypto.randomInt`),
   hashes it with bcrypt for storage.
3. The plaintext password is returned **once**, in the creation
   response only, and never retrievable again. A "reset password"
   action generates a new one the same way.

**Task creation and grading**
1. Teacher creates a `Task` under a subject and group, and adds
   `Question`s (`MULTIPLE_CHOICE` or `FILL_BLANK`), each with a
   correct answer.
2. Student opens an assigned task and submits answers.
3. Backend grades automatically: exact match for multiple choice,
   case-insensitive/trimmed match for fill-in-the-blank. No manual
   grading step exists for these two types.
4. `Answer.isCorrect` and `Submission.score` are computed and stored
   on submission.

**Statistics (read-only aggregation, no separate storage)**
- Per-student progress: tasks completed, average score, last activity.
- Per-task stats: completion count, average score, most-missed
  questions.
- Group analysis: average score over time.
- Leaderboard: students ranked by score within a group.

All statistics queries are scoped to the requesting teacher's own
groups (or, for a student, to themself).

## 7. Internationalization

Separation of concerns between logic and language:

- The backend never returns user-facing text. It returns stable
  **error/status codes** (e.g. `ERR_INVALID_CREDENTIALS`,
  `ERR_GROUP_NOT_FOUND`), defined once in
  `common/constants/error-codes.constant.ts`.
- The frontend maps codes to localized strings via `react-i18next`,
  with `locales/uz.json` and `locales/en.json`. Translation lives in
  exactly one place.
- No UI text is hardcoded in components — always a translation key
  (e.g. `t('group.create.success')`).

## 8. Error Handling

- Domain errors use NestJS's built-in exceptions
  (`NotFoundException`, `ForbiddenException`, `BadRequestException`),
  each carrying a structured `errorCode`.
- A global `HttpExceptionFilter` normalizes every error response to
  `{ statusCode, errorCode, message }` — `message` is an English
  technical string for logs/debugging, never shown directly in the UI.
- All request input is validated via `class-validator` DTOs at the
  controller boundary.

## 9. Testing Strategy

- **Unit tests**: business logic in isolation with repositories
  mocked — grading logic (especially fill-in-the-blank comparison),
  password generation, statistics calculations, guard/RBAC logic.
- **Integration tests**: `@nestjs/testing` against a real test
  PostgreSQL database, covering full controller → service → DB flows
  for the key scenarios — login, student creation, task submission
  and auto-grading, statistics retrieval, and cross-teacher access
  denial (one teacher must not be able to read another teacher's
  group/student/task data).
- Test files are colocated with source (`*.spec.ts`), per Nest
  convention.

## 10. Out of Scope (MVP)

- Multiple subjects beyond English (the `Subject` table supports it,
  but only one row is seeded initially).
- Manual grading / essay / file-upload task types.
- Students belonging to more than one group.
- Super admin visibility into groups/students/statistics.
- Any deployment/hosting concerns — local run only for coursework.
