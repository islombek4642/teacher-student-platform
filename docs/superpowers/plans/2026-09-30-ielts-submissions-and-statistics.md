# IELTS Submissions, Group Tasks & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture IELTS test submissions from the iframe in real time, persist them to PostgreSQL, enable group-level task assignment, build group statistics & leaderboard for teachers, and provide personal progress tracking for students.

**Architecture:** Extend the Prisma schema with `IeltsSubmission` linked to `StudentProfile` and `IeltsTask`. Inject a `postMessage` dispatcher into IELTS CDI HTML tests to send score and band upon completion, caught by `IeltsTaskViewer` which invokes a NestJS submission API. Replace teacher placeholder pages (`GroupTasksPage`, `GroupStatisticsPage`) with full table, assignment dialog, and leaderboard views, and enhance the student dashboard with recent test history.

**Tech Stack:** NestJS 11, TypeScript, Prisma ORM 6, PostgreSQL, React 19, Tailwind CSS, Lucide / Iconify icons, TanStack Query, Vite.

**Spec:** `docs/superpowers/specs/2026-09-30-ielts-submissions-and-statistics-design.md`

## Global Constraints

- All UI text must use i18next `t(...)` keys in `frontend/src/locales/uz.json` and `en.json`.
- Strict TypeScript typing; avoid `any`.
- All database mutations must maintain referential integrity with cascading deletes where appropriate.
- Test preview by `TEACHER` or `SUPER_ADMIN` must not create submission records.
- Existing tests must remain passing.

## Review Focus

1. Multiple submissions from the same student on the same task must update/upsert cleanly without a 500 duplicate key error.
2. Incomplete or non-numeric submission payloads must be rejected with 400 Bad Request via class-validator.
3. Teacher preview of an IELTS task must not trigger a submission mutation or show false success toasts.
4. If a group has 0 submissions or 0 students, group statistics endpoints and frontend cards must display clean empty/zero states without NaN or Division by Zero errors.
5. The `postMessage` listener must strictly validate event data origin or structure to prevent unintended triggers from third-party scripts.

---

### Task 1: Prisma Schema Migration for `IeltsSubmission`

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: Migration via Prisma CLI

**Interfaces:**
- Produces: `IeltsSubmission` Prisma model with fields `id`, `studentId`, `taskId`, `score`, `total`, `band`, `answersJson`, `submittedAt`.

- [ ] **Step 1: Add `IeltsSubmission` model to `schema.prisma`**
  Add `IeltsSubmission` model and add `submissions IeltsSubmission[]` relation to `StudentProfile` and `IeltsTask`.
- [ ] **Step 2: Run Prisma migration & generate client**
  Run `npx prisma migrate dev --name add_ielts_submission` in `backend`.
- [ ] **Step 3: Verify Prisma Client generation**
  Run: `node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); if (!p.ieltsSubmission) throw new Error('Model missing'); console.log('OK');"`
  Expected: `OK`
- [ ] **Step 4: Commit**
  ```bash
  git add backend/prisma/schema.prisma backend/prisma/migrations/
  git commit -m "feat(db): add IeltsSubmission model and relations"
  ```

---

### Task 2: Backend IELTS Submission API Endpoints & DTOs

**Files:**
- Create: `backend/src/ielts/dto/submit-ielts-task.dto.ts`
- Modify: `backend/src/ielts/ielts.service.ts`
- Modify: `backend/src/ielts/ielts.controller.ts`
- Test: `backend/src/ielts/ielts.service.spec.ts`

**Interfaces:**
- Produces:
  - `POST /ielts/:id/submit`: accepts `SubmitIeltsTaskDto`, returns `{ id, taskId, score, total, band, submittedAt }`.
  - `GET /ielts/:id/my-submission`: returns `IeltsSubmission | null` for current student.
  - `GET /ielts/my-submissions`: returns list of student's completed submissions.

- [ ] **Step 1: Write failing unit test in `ielts.service.spec.ts` for `submitTask`**
  Test student submission upsert, score validation, and `getMySubmission`.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm --prefix backend test -- ielts.service.spec.ts`
  Expected: FAIL with "submitTask is not a function"
- [ ] **Step 3: Create `SubmitIeltsTaskDto`**
  Validate `score` (int, min 0, max 40), `total` (int, default 40), `band` (number, min 0, max 9), and `results` (array).
- [ ] **Step 4: Implement `submitTask`, `getMySubmission`, and `getMySubmissions` in `ielts.service.ts`**
  Resolve `studentProfile` from `user.sub`, perform `prisma.ieltsSubmission.upsert`.
- [ ] **Step 5: Expose routes in `ielts.controller.ts`**
  Decorate with `@Roles(Role.STUDENT)` and `@CurrentUser()`.
- [ ] **Step 6: Run tests to verify they pass**
  Run: `npm --prefix backend test -- ielts.service.spec.ts`
  Expected: PASS
- [ ] **Step 7: Commit**
  ```bash
  git add backend/src/ielts/
  git commit -m "feat(ielts): implement student test submission and history endpoints"
  ```

---

### Task 3: Backend Group Tasks & Group Statistics Endpoints

**Files:**
- Modify: `backend/src/groups/groups.service.ts`
- Modify: `backend/src/groups/groups.controller.ts`
- Test: `backend/src/groups/groups.service.spec.ts`

**Interfaces:**
- Produces:
  - `GET /groups/:groupId/tasks`: returns tasks with group-level submission stats (`totalSubmissions`, `studentCount`, `averageBand`).
  - `POST /groups/:groupId/tasks/:taskId/assign`: toggles task assignment to group.
  - `GET /groups/:groupId/statistics/overview`: returns group averages, total submissions, completion rate.
  - `GET /groups/:groupId/statistics/leaderboard`: returns ranked students list.

- [ ] **Step 1: Write failing unit tests in `groups.service.spec.ts` for group tasks and statistics**
  Test group stats calculation (handling 0 students/submissions gracefully) and leaderboard ordering.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm --prefix backend test -- groups.service.spec.ts`
  Expected: FAIL
- [ ] **Step 3: Implement methods in `groups.service.ts`**
  Compute overview statistics, query student submissions, calculate average Band, and build leaderboard.
- [ ] **Step 4: Add controller routes in `groups.controller.ts`**
  Add endpoints with `@Roles(Role.TEACHER, Role.SUPER_ADMIN)` and ownership check.
- [ ] **Step 5: Run tests to verify they pass**
  Run: `npm --prefix backend test -- groups.service.spec.ts`
  Expected: PASS
- [ ] **Step 6: Commit**
  ```bash
  git add backend/src/groups/
  git commit -m "feat(groups): add group tasks and statistics endpoints"
  ```

---

### Task 4: Iframe Bridge Injection & `IeltsTaskViewer` Real-time Submission

**Files:**
- Modify: `backend/src/ielts/ielts.service.ts`
- Modify: `frontend/src/features/ielts/api/ielts.api.ts`
- Modify: `frontend/src/features/ielts/IeltsTaskViewer.tsx`
- Test: `frontend/src/features/ielts/IeltsTaskViewer.spec.tsx`

**Interfaces:**
- Consumes: `POST /ielts/:id/submit`
- Produces: Injected iframe script dispatching `IELTS_TEST_SUBMITTED`, and React listener auto-submitting on student role.

- [ ] **Step 1: Write failing frontend test in `IeltsTaskViewer.spec.tsx`**
  Verify that when an `IELTS_TEST_SUBMITTED` event is received and the user is a `STUDENT`, `submitIeltsTask` is called.
- [ ] **Step 2: Update `ielts.service.ts` to inject submission postMessage hook**
  Hook into `checkAnswers` so that when answers are checked, `window.parent.postMessage({ type: 'IELTS_TEST_SUBMITTED', payload: { score, total, band, results: resultsData } }, '*')` is executed.
- [ ] **Step 3: Add `useSubmitIeltsTask` mutation to `ielts.api.ts`**
  Mutation calling `POST /ielts/:id/submit`, invalidating related query caches.
- [ ] **Step 4: Update `IeltsTaskViewer.tsx`**
  Add `message` listener for `IELTS_TEST_SUBMITTED`, trigger submission if `user.role === 'STUDENT'`, and display toast notification with resulting Band.
- [ ] **Step 5: Run frontend test**
  Run: `npm --prefix frontend test -- IeltsTaskViewer.spec.tsx`
  Expected: PASS
- [ ] **Step 6: Commit**
  ```bash
  git add backend/src/ielts/ielts.service.ts frontend/src/features/ielts/
  git commit -m "feat(ielts): connect iframe checkAnswers to parent submission mutation"
  ```

---

### Task 5: Frontend Group Tasks Management (`GroupTasksPage`)

**Files:**
- Create: `frontend/src/features/teacher/api/group-tasks.api.ts`
- Create: `frontend/src/features/teacher/AssignTaskDialog.tsx`
- Modify: `frontend/src/features/teacher/GroupTasksPage.tsx`
- Modify: `frontend/src/locales/uz.json` and `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: `GET /groups/:groupId/tasks`, `POST /groups/:groupId/tasks/:taskId/assign`
- Produces: Interactive group task listing with submission progress, assign/unassign actions, and view modal.

- [ ] **Step 1: Add i18n keys to `uz.json` and `en.json`**
  Keys for task assignment, submission counts, and empty states.
- [ ] **Step 2: Create `group-tasks.api.ts` with TanStack Query hooks**
  Hooks: `useGroupTasks(groupId)` and `useAssignGroupTask()`.
- [ ] **Step 3: Create `AssignTaskDialog.tsx`**
  Modal allowing teacher to select available IELTS tasks to assign to the group.
- [ ] **Step 4: Implement `GroupTasksPage.tsx`**
  Replace placeholder with tasks table: Title, Type badge, Submissions count (`X / Y o'quvchi`), Average Band, Actions (View, Unassign).
- [ ] **Step 5: Verify build & tests**
  Run: `npm --prefix frontend run build`
  Expected: Build succeeds with 0 errors.
- [ ] **Step 6: Commit**
  ```bash
  git add frontend/src/features/teacher/ frontend/src/locales/
  git commit -m "feat(teacher): build GroupTasksPage with task assignment and submission tracking"
  ```

---

### Task 6: Frontend Group Statistics & Leaderboard (`GroupStatisticsPage`)

**Files:**
- Create: `frontend/src/features/teacher/api/group-statistics.api.ts`
- Modify: `frontend/src/features/teacher/GroupStatisticsPage.tsx`
- Modify: `frontend/src/locales/uz.json` and `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: `GET /groups/:groupId/statistics/overview`, `GET /groups/:groupId/statistics/leaderboard`
- Produces: KPI cards (Average Band, Tests Taken, Completion Rate) and ranked Student Leaderboard table.

- [ ] **Step 1: Add i18n keys for group statistics and leaderboard**
  Keys for average band, rank, tests completed, medal badges.
- [ ] **Step 2: Create `group-statistics.api.ts`**
  Hooks: `useGroupOverviewStats(groupId)` and `useGroupLeaderboard(groupId)`.
- [ ] **Step 3: Implement `GroupStatisticsPage.tsx`**
  Replace placeholder with:
  - Metric summary cards (Overall Average Band, Listening Band, Reading Band, Total Submissions).
  - Leaderboard table: Rank (with medal icons for 1-3), Student name, Username, Tests taken, Average Band, Last active date.
- [ ] **Step 4: Verify build**
  Run: `npm --prefix frontend run build`
  Expected: Build succeeds.
- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/features/teacher/GroupStatisticsPage.tsx frontend/src/features/teacher/api/ frontend/src/locales/
  git commit -m "feat(teacher): build GroupStatisticsPage with overview metrics and student leaderboard"
  ```

---

### Task 7: Student Dashboard & Personal Results Tracking

**Files:**
- Create: `frontend/src/features/student/api/student-results.api.ts`
- Modify: `frontend/src/features/student/StudentDashboardPage.tsx`
- Modify: `frontend/src/features/ielts/ListeningPage.tsx`
- Modify: `frontend/src/features/ielts/ReadingPage.tsx`
- Modify: `frontend/src/locales/uz.json` and `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: `GET /ielts/my-submissions`
- Produces: Student dashboard recent results card, task completion badges (e.g. `Band 7.5`) on Listening/Reading lists.

- [ ] **Step 1: Add i18n keys for student results and history**
- [ ] **Step 2: Create `student-results.api.ts`**
  Hook `useStudentMySubmissions()` to fetch student's past attempts.
- [ ] **Step 3: Update `StudentDashboardPage.tsx`**
  Add "So'nggi natijalarim" (Recent Submissions) card displaying recent test titles, types, band scores, and dates.
- [ ] **Step 4: Update `ListeningPage.tsx` and `ReadingPage.tsx`**
  When viewed by a student, show completion status next to each task (e.g., green `Band 7.0` badge if submitted).
- [ ] **Step 5: Run full backend and frontend test suites**
  Run: `npm --prefix backend test && npm --prefix frontend test`
  Expected: All tests PASS.
- [ ] **Step 6: Commit**
  ```bash
  git add frontend/src/features/student/ frontend/src/features/ielts/ frontend/src/locales/
  git commit -m "feat(student): show test results history in student dashboard and task lists"
  ```
