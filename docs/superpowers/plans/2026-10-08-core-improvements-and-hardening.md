# Core Improvements & System Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver complete, robust implementations for the 8 audited functional gaps and stability issues: Prisma unit test mocking, active JWT validation, orphan user cleanup on group deletion, user profile & password change, test results export to Excel/PDF, dataset-hardened exam timer with auto-submit, teacher grading interface for Writing, and the IELTS Speaking module.

**Architecture:** Implement fixes and features across NestJS backend and React/Vite frontend following domain module patterns. Backend uses Prisma transactions and JWT strategy guards; frontend utilizes Tailwind CSS, React Query, `i18n` localization (no hardcoding), and browser native `MediaRecorder` API for audio.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, Passport JWT, React 19, TypeScript, Tailwind CSS, TanStack Query, `xlsx-js-style`, `jspdf`, `jspdf-autotable`.

**Spec:** [docs/superpowers/specs/2026-10-08-core-improvements-and-hardening-design.md](file:///d:/teacher-student-platform/docs/superpowers/specs/2026-10-08-core-improvements-and-hardening-design.md)

## Global Constraints
- **Zero hardcoding:** Every label, placeholder, and message in UI must use `i18n` with entries in both `frontend/src/locales/uz.json` and `frontend/src/locales/en.json`.
- **Role security:** All backend mutations and protected queries must be guarded by `JwtAuthGuard` and `RolesGuard`.
- **Offline test speed:** Unit tests must not depend on live database connections.

## Review Focus
1. **Deactivated user tokens:** Tokens issued before deactivation must be rejected on the very next HTTP request.
2. **Student deletion cascade:** Deleting a group must delete student `User` authentication records in `User`, not just `StudentProfile`.
3. **Timer refresh manipulation:** Refreshing the browser page mid-test must calculate elapsed time accurately from `localStorage` without resetting to 60:00.
4. **Writing auto-submission:** Reading and Writing tests reaching 00:00 must submit answers automatically without getting trapped in commented-out scripts or browser `alert()` popups.
5. **Teacher Band rounding:** Overall Writing/Speaking Bands must adhere to official IELTS 0.5 rounding rules (e.g. 6.25 -> 6.5, 6.75 -> 7.0).

---

## Phase 1: Security & Stability (Tasks 1 - 3)

### Task 1: Prisma Service Unit Test Resilience
**Files:**
- Modify: `backend/src/common/prisma/prisma.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService` lifecycle methods (`onModuleInit`, `$disconnect`, `$connect`)
- Produces: Resilient, offline-capable unit tests passing in <100ms

- [ ] **Step 1: Write resilient mocked test in `backend/src/common/prisma/prisma.service.spec.ts`**
  Mock `$connect` and `$disconnect` so the test suite does not attempt a real TCP connection to PostgreSQL within the 5000ms Jest timeout.
- [ ] **Step 2: Run Jest test to verify execution**
  Run: `npm --prefix backend test prisma.service.spec.ts`
  Expected: PASS in <1s
- [ ] **Step 3: Commit**
  ```bash
  git add backend/src/common/prisma/prisma.service.spec.ts
  git commit -m "fix(test): mock prisma connection in prisma.service.spec"
  ```

---

### Task 2: Real-time JWT Invalidation & Active Status Verification
**Files:**
- Modify: `backend/src/auth/strategies/jwt.strategy.ts`
- Modify: `backend/src/auth/strategies/jwt.strategy.spec.ts` (or create if missing)
- Modify: `backend/src/common/constants/error-codes.ts`

**Interfaces:**
- Consumes: `JwtPayload.sub`
- Produces: Throws `UnauthorizedException` with `ACCOUNT_DEACTIVATED` if `user.isActive === false` or user is not found

- [ ] **Step 1: Write failing unit test for `JwtStrategy` checking deactivated user rejection**
  Verify that when `prisma.user.findUnique` returns `{ isActive: false }`, `strategy.validate(payload)` rejects with `UnauthorizedException`.
- [ ] **Step 2: Run test to verify failure**
  Run: `npm --prefix backend test jwt.strategy.spec.ts`
  Expected: FAIL
- [ ] **Step 3: Implement active user verification in `backend/src/auth/strategies/jwt.strategy.ts`**
  Inject `PrismaService`, query `prisma.user.findUnique({ where: { id: payload.sub }, select: { isActive: true } })`, and throw `UnauthorizedException` if inactive or missing.
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm --prefix backend test jwt.strategy.spec.ts`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/auth/strategies/jwt.strategy.ts backend/src/auth/strategies/jwt.strategy.spec.ts
  git commit -m "feat(auth): verify user isActive status in jwt strategy"
  ```

---

### Task 3: Orphan User Cleanup on Group Deletion
**Files:**
- Modify: `backend/src/groups/groups.service.ts`
- Modify: `backend/src/groups/groups.service.spec.ts`

**Interfaces:**
- Consumes: `teacherProfileId: string`, `groupId: string`
- Produces: Deletes `Group` and all associated student `User` records inside a single `prisma.$transaction`

- [ ] **Step 1: Write unit test in `groups.service.spec.ts`**
  Verify that deleting a group finds associated student `userId`s and executes `tx.user.deleteMany` for those IDs.
- [ ] **Step 2: Run test to verify failure**
  Run: `npm --prefix backend test groups.service.spec.ts`
  Expected: FAIL
- [ ] **Step 3: Update `remove` method in `backend/src/groups/groups.service.ts`**
  Wrap group deletion in `this.prisma.$transaction` and delete student login accounts in `tx.user`.
- [ ] **Step 4: Run test to verify PASS**
  Run: `npm --prefix backend test groups.service.spec.ts`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add backend/src/groups/groups.service.ts backend/src/groups/groups.service.spec.ts
  git commit -m "fix(groups): delete orphaned user records on group removal"
  ```

---

## Phase 2: User Settings & Results Export (Tasks 4 - 5)

### Task 4: User Profile & Self-Service Password Change
**Files:**
- Modify: `backend/src/auth/auth.controller.ts`
- Modify: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/dto/change-password.dto.ts`
- Create: `frontend/src/features/profile/ProfileSettingsDialog.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx` (user menu)
- Modify: `frontend/src/locales/uz.json`, `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: `POST /auth/change-password` `{ currentPassword, newPassword }`
- Produces: Updates bcrypt `passwordHash` and encrypted `currentPassword`, returns success status

- [ ] **Step 1: Add backend DTO and service method for `changePassword`**
  Verify old password with `bcrypt.compare`, encrypt new password, update user record in database.
- [ ] **Step 2: Add backend unit tests for `changePassword`**
  Run: `npm --prefix backend test auth.service.spec.ts`
  Expected: PASS
- [ ] **Step 3: Build `ProfileSettingsDialog` in frontend**
  Include tabs/sections for "Profil ma'lumotlari" (Name, role, username) and "Parolni o'zgartirish" (Current password, new password, confirm).
- [ ] **Step 4: Add i18n translation strings to `uz.json` and `en.json`**
  Add all dialog headers, input labels, error states, and success toasts.
- [ ] **Step 5: Attach dialog trigger to user avatar/settings in `AppLayout.tsx`**
- [ ] **Step 6: Commit**
  ```bash
  git add backend/src/auth frontend/src/features/profile frontend/src/components/layout frontend/src/locales
  git commit -m "feat(auth): add profile settings and self-service password change"
  ```

---

### Task 5: Exam Results & Leaderboard Export to Excel and PDF
**Files:**
- Create: `frontend/src/utils/exportResults.ts`
- Modify: `frontend/src/features/teacher/GroupStatisticsPage.tsx`
- Modify: `frontend/src/features/teacher/GroupStudentsPage.tsx`
- Modify: `frontend/src/locales/uz.json`, `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: Student scores, band scores, attempt dates, task titles
- Produces: Styled `.xlsx` file and printable `.pdf` file download

- [ ] **Step 1: Create client-side export utility `frontend/src/utils/exportResults.ts`**
  Use `xlsx-js-style` for formatted Excel sheets with column widths and styled headers.
  Use `jspdf` and `jspdf-autotable` for formatted PDF reports with header banner, group title, and student table.
- [ ] **Step 2: Add "Export to Excel" and "Export to PDF" buttons in `GroupStatisticsPage.tsx` and `GroupStudentsPage.tsx`**
- [ ] **Step 3: Add all i18n keys to `uz.json` and `en.json`**
- [ ] **Step 4: Test export functions with sample data**
  Verify `.xlsx` and `.pdf` files download with correct rankings, dates, and band scores.
- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/utils/exportResults.ts frontend/src/features/teacher frontend/src/locales
  git commit -m "feat(export): add excel and pdf export for group statistics and student scores"
  ```

---

## Phase 3: Assessment & Timing (Tasks 6 - 7)

### Task 6: Dataset-Hardened Exam Timer & Auto-Submission Engine
**Files:**
- Modify: `backend/src/ielts/ielts.service.ts`
- Modify: `backend/src/ielts/ielts.service.spec.ts`
- Modify: `frontend/src/features/ielts/IeltsTaskViewer.tsx`
- Modify: `frontend/src/locales/uz.json`, `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: `IeltsTask.type`, `localStorage` timestamp
- Produces: Injected unified timer script in HTML iframe; guarantees header timer display, hides cheats/controls, synchronizes elapsed time across F5 reloads, auto-submits on 00:00

- [ ] **Step 1: Write unit tests in `backend/src/ielts/ielts.service.spec.ts` for timer injection**
  Test that `normalizeIeltsHeader` guarantees `.timer-container` for tasks without it, and injects CSS hiding `.timer-controls` in student mode.
- [ ] **Step 2: Implement `IELTS_TIMER_SCRIPT` in `backend/src/ielts/ielts.service.ts`**
  Inject unified script that checks `localStorage`, updates `.timer-display`, triggers warning colors (amber at 5m, red at 1m), and when time reaches 00:00 executes `window.checkAnswers()` or `window.submitTest()`.
- [ ] **Step 3: Run backend unit tests**
  Run: `npm --prefix backend test ielts.service.spec.ts`
  Expected: PASS
- [ ] **Step 4: Update `IeltsTaskViewer.tsx` to handle auto-submission toast and storage cleanup**
- [ ] **Step 5: Add i18n keys for time warnings and auto-submission notifications**
- [ ] **Step 6: Commit**
  ```bash
  git add backend/src/ielts frontend/src/features/ielts frontend/src/locales
  git commit -m "feat(ielts): implement unified dataset-hardened exam timer and auto-submit"
  ```

---

### Task 7: Teacher Review & Grading Interface for Writing
**Files:**
- Modify: `backend/prisma/schema.prisma` (add `isGraded`, `criteriaJson`, `feedback`, `gradedById`, `gradedAt`)
- Modify: `backend/src/ielts/ielts.service.ts`
- Modify: `backend/src/ielts/ielts.controller.ts`
- Create: `backend/src/ielts/dto/grade-submission.dto.ts`
- Create: `frontend/src/features/teacher/submissions/WritingGradingDialog.tsx`
- Modify: `frontend/src/features/teacher/GroupStatisticsPage.tsx` / Submissions table
- Modify: `frontend/src/locales/uz.json`, `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: `PATCH /ielts/submissions/:id/grade` `{ band, criteria: { tr, cc, lr, gra }, feedback }`
- Produces: Updates submission record with final band score, marks `isGraded = true`, shows breakdown to student

- [ ] **Step 1: Update Prisma schema and run migration**
  Add grading fields to `IeltsSubmission` model:
  ```prisma
  isGraded     Boolean   @default(false)
  gradedById   String?
  gradedAt     DateTime?
  criteriaJson Json?
  feedback     String?   @db.Text
  ```
- [ ] **Step 2: Add `gradeSubmission` endpoint in `backend/src/ielts/`**
  Validate teacher ownership/permissions, calculate rounded IELTS overall band score from 4 criteria, and save.
- [ ] **Step 3: Write unit tests in `ielts.service.spec.ts` for grading logic and band score calculation**
  Run: `npm --prefix backend test ielts.service.spec.ts`
  Expected: PASS
- [ ] **Step 4: Create `WritingGradingDialog.tsx` in frontend**
  Display student's Task 1 & Task 2 side-by-side with word counts, 4 criteria input sliders/selectors (1.0 to 9.0 in 0.5 steps), auto-calculated overall Band, and rich feedback textarea.
- [ ] **Step 5: Add i18n strings for grading rubrics and feedback**
- [ ] **Step 6: Commit**
  ```bash
  git add backend frontend
  git commit -m "feat(ielts): implement teacher review and grading interface for writing"
  ```

---

## Phase 4: Speaking Module (Task 8)

### Task 8: IELTS Speaking Module & Audio Submission
**Files:**
- Modify: `backend/prisma/schema.prisma` (add `SPEAKING` to `IeltsTaskType`, create `SpeakingPrompt`)
- Modify: `backend/src/ielts/ielts.service.ts`
- Create: `backend/src/ielts/speaking.controller.ts` (or add to `ielts.controller.ts`)
- Create: `frontend/src/features/ielts/SpeakingPage.tsx` (replace placeholder)
- Create: `frontend/src/features/ielts/speaking/AudioRecorder.tsx`
- Create: `frontend/src/features/ielts/speaking/SpeakingTestRunner.tsx`
- Modify: `frontend/src/locales/uz.json`, `frontend/src/locales/en.json`

**Interfaces:**
- Consumes: Browser `navigator.mediaDevices.getUserMedia`, audio multipart upload
- Produces: Full IELTS Speaking test experience (Part 1, Part 2 with 1m prep timer, Part 3), saves audio recordings, allows teacher playback and grading

- [ ] **Step 1: Extend backend schema with `SpeakingPrompt` model and audio upload support**
- [ ] **Step 2: Implement multipart audio upload endpoint `/ielts/speaking/upload`**
- [ ] **Step 3: Build `AudioRecorder.tsx` using `MediaRecorder` API**
  Support recording, stop, timer display, waveform/visualizer, and playback preview.
- [ ] **Step 4: Build `SpeakingTestRunner.tsx` in `SpeakingPage.tsx`**
  Part 1: 4-5 interview questions.
  Part 2: Cue card topic with 60-second prep countdown and 2-minute response timer.
  Part 3: 4-5 analytical discussion questions.
- [ ] **Step 5: Connect Speaking submissions to Teacher Grading interface**
  Reuse grading dialog with audio player and Speaking criteria (FC, LR, GRA, PR).
- [ ] **Step 6: Add i18n strings in `uz.json` and `en.json`**
- [ ] **Step 7: Commit**
  ```bash
  git add backend frontend
  git commit -m "feat(ielts): implement full speaking module with audio recording and grading"
  ```

---

## Final Verification Checklist
1. `npm --prefix backend test` — All backend unit tests pass without network dependency.
2. `npm --prefix frontend test` — All frontend unit tests pass.
3. `npm --prefix backend run build` — Backend builds cleanly.
4. `npm --prefix frontend run build` — Frontend builds cleanly with zero TypeScript errors.
