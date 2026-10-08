# Core Improvements & System Hardening Technical Design Specification

**Date:** 2026-10-08  
**Status:** Draft / Ready for Review  
**Target:** Teacher-Student Platform (`backend` & `frontend`)

---

## 1. Executive Summary

This specification defines the architectural design, requirements, data models, API endpoints, and user experience for resolving the 8 critical functional and architectural gaps identified during the system audit:

1. **IELTS Speaking Module:** Interactive voice-recording test interface, audio storage, submission, and playback.
2. **Teacher Grading & Review for Writing & Speaking:** Comprehensive assessment interface allowing teachers to evaluate essays and recordings using official IELTS 4-criteria rubrics (TR/FC, CC/PR, LR, GRA), assign Band scores, and leave feedback.
3. **Countdown Timer & Auto-Submission:** Real-time exam timer with warning thresholds and automatic test delivery across Reading, Listening, and Writing.
4. **Exam Results & Leaderboard Export:** Exporting student test scores, attempt histories, and group rankings to structured Excel and PDF documents.
5. **User Profile & Self-Service Password Change:** Secure password modification and profile management for Super Admins, Teachers, and Students.
6. **Orphan User Cleanup on Group Deletion:** Preventing lingering orphaned `User` credentials when student groups are deleted.
7. **Real-time JWT Invalidation & Active Status Verification:** Ensuring deactivated users are immediately blocked from API access.
8. **Prisma Service Unit Test Resilience:** Fixing test timeouts in `prisma.service.spec.ts` to ensure fast, offline-capable test runs.

---

## 2. Module Specifications

### 2.1 IELTS Speaking Module

#### 2.1.1 Overview
The Speaking module replaces the current "Coming Soon" placeholder in [SpeakingPage.tsx](file:///d:/teacher-student-platform/frontend/src/features/ielts/SpeakingPage.tsx). It enables students to record audio responses for IELTS Speaking Part 1 (Introduction/Interview), Part 2 (Cue Card with 1-minute prep timer), and Part 3 (Two-way Discussion).

#### 2.1.2 Functional Requirements
- **Audio Capture:** Built with browser native `MediaRecorder` API (`audio/webm;codecs=opus` with fallback to `audio/mp4` / `audio/wav`).
- **Test Structure:**
  - **Part 1:** 4–5 short answer prompts. Student records 15–30 seconds per question.
  - **Part 2:** Cue card topic displayed with a 60-second preparation timer, followed by a 2-minute recording session.
  - **Part 3:** 4–5 follow-up analytical questions (30–60 seconds per response).
- **Controls & Safety:**
  - Microphone permission check with intuitive status indicators.
  - Waveform visualizer / recording status indicator.
  - Playback preview before final submission.
  - Re-record option (unless locked in formal exam mode).
- **Audio Storage:**
  - Multipart upload to backend: stored in managed local media directory (`/uploads/speaking/`) or Supabase Storage / S3.

#### 2.1.3 Data Model Extensions
```prisma
enum IeltsTaskType {
  LISTENING
  READING
  WRITING
  SPEAKING
}

model SpeakingPrompt {
  id          String     @id @default(uuid())
  taskId      String
  task        IeltsTask  @relation(fields: [taskId], references: [id], onDelete: Cascade)
  part        Int        // 1, 2, or 3
  question    String
  cuePoints   String[]   // For Part 2 bullet points
  prepSeconds Int        @default(0) // 60 for Part 2
  maxSeconds  Int        @default(60)
  order       Int        @default(1)
}
```

---

### 2.2 Teacher Grading & Review for Writing and Speaking

#### 2.2.1 Problem Statement
Currently, Writing submissions receive an automatic `Band: 0`. There is no interface for teachers to read essays or listen to Speaking recordings, assess criteria, or provide constructive feedback.

#### 2.2.2 Requirements
- **Teacher Submissions List:**
  - Accessible via Group view (`/teacher/groups/:id/submissions`) and Task view.
  - Filter by status: `Pending Review` vs `Graded`.
  - Shows student name, task title, submission date, attempt number, and current status.
- **Grading Interface Modal / Page:**
  - **For Writing:** Displays student's Task 1 (150+ words) and Task 2 (250+ words) side-by-side with word counts and the original task prompt.
  - **For Speaking:** Integrated audio player for each part/prompt.
  - **Rubric Assessment Form (1.0 – 9.0 in 0.5 increments):**
    - **Writing Criteria:**
      1. Task Achievement / Response (TR)
      2. Coherence & Cohesion (CC)
      3. Lexical Resource (LR)
      4. Grammatical Range & Accuracy (GRA)
    - **Speaking Criteria:**
      1. Fluency & Coherence (FC)
      2. Lexical Resource (LR)
      3. Grammatical Range & Accuracy (GRA)
      4. Pronunciation (PR)
    - **Overall Band Calculation:** Auto-calculated arithmetic average rounded to nearest 0.5 according to official IELTS rules (e.g. 6.25 -> 6.5, 6.75 -> 7.0).
  - **Teacher Feedback:** Rich text or Markdown feedback field for strengths, errors, and recommendations.

#### 2.2.3 Data Model Extensions
```prisma
model IeltsSubmission {
  id              String         @id @default(uuid())
  studentId       String
  taskId          String
  score           Int            // Word count for Writing, Raw score for R/L
  total           Int            @default(40)
  band            Float
  attempt         Int            @default(1)
  answersJson     Json           // Contains text answers or audio URLs
  isGraded        Boolean        @default(false)
  gradedById      String?
  gradedAt        DateTime?
  criteriaJson    Json?          // { tr: 6.5, cc: 7.0, lr: 6.0, gra: 6.5 }
  feedback        String?        @db.Text
  submittedAt     DateTime       @default(now())

  student         StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)
  task            IeltsTask      @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@unique([studentId, taskId, attempt])
  @@index([isGraded])
}
```

#### 2.2.4 API Endpoints
- `GET /ielts/submissions/pending` — List submissions requiring teacher grading.
- `PATCH /ielts/submissions/:id/grade` — Submit criteria scores, final Band, and feedback.
  - Request Body:
    ```json
    {
      "band": 6.5,
      "criteria": { "tr": 6.5, "cc": 7.0, "lr": 6.0, "gra": 6.5 },
      "feedback": "Good vocabulary in Task 2. Work on paragraph transitions in Task 1."
    }
    ```

---

### 2.3 Countdown Timer & Auto-Submission (Dataset-Hardened Engine)

#### 2.3.1 Dataset Audit & Gap Findings
A complete audit across all 154 dataset HTML files revealed critical inconsistencies and security loopholes:
1. **Reading (42 files total):**
   - **37 files (06 to 42):** Contain embedded timer scripts (`timeInSeconds = 3600;`), but when `timeInSeconds <= 0`, **`checkAnswers()` is commented out** (`// checkAnswers(); // Disabled to prevent modal from opening automatically`). Thus, the test never auto-submits.
   - **Pause & Reset exploits:** 37 files contain `.timer-controls` (`#timer-toggle-btn` and `#timer-reset-btn`), allowing students to pause or reset the timer back to 60:00 at will.
   - **5 files (01 to 05):** Have **no `.timer-container` and no timer script** at all.
2. **Writing (23 files total):**
   - All 23 files have `timeInSeconds = 3600` and `submitTest()` on completion, but use blocking native `alert()` dialogs before submitting.
   - 5 files have pause/reset controls.
3. **Listening (89 files total):**
   - All 89 files have HTML markup for `.timer-container`, but **53 files explicitly hide it via CSS** (`display: none; /* Timer hidden */`) and skip timer initiation (`testStarted = true; // Timer removed, skip startTimer`).
   - 36 files lack `timeInSeconds` initialization entirely.
4. **RAM-Only State Across All Datasets:**
   - None of the datasets persist time in `localStorage`. Pressing F5 (refresh) resets the timer back to 60:00, creating an infinite time exploit.

#### 2.3.2 Unified Architecture & Hardening Solution
To eliminate dataset discrepancies and prevent student exploits, the platform injects a **Universal IELTS Timer Controller** via `ielts.service.ts`:

1. **Header Normalization & Guaranteed Container:**
   - If a dataset lacks `.timer-container` (e.g., Reading 01–05), `normalizeIeltsHeader()` automatically generates a standard `<div class="timer-container"><span class="timer-display">60:00</span></div>` inside the fixed header.
   - For student examinees (`!isPreview && !isReview`), `.timer-controls` is forcefully hidden via CSS (`.timer-controls { display: none !important; }`), preventing students from pausing or resetting the timer.
   - In Review or Teacher Preview mode, the timer is frozen or displayed statically.

2. **Persistent Countdown (`localStorage` Synchronization):**
   - The injected timer engine checks `localStorage.getItem('ielts_timer_' + taskId + '_' + studentId)`:
     - On first launch: stores start timestamp `startedAt = Date.now()` and duration (Reading: 3600s, Writing: 3600s, Listening: 2400s).
     - On page reload: calculates remaining seconds: `duration - Math.floor((Date.now() - startedAt) / 1000)`.
     - Updates `.timer-display` synchronously every second.

3. **Time Expiration & Non-blocking Auto-Submit (`00:00`):**
   - When time reaches `00:00`:
     - Overrides/bypasses blocking `window.alert()`.
     - **For Reading & Listening:** Programmatically executes `if (typeof window.checkAnswers === 'function') window.checkAnswers();` which triggers the injected `IELTS_SUBMISSION_SCRIPT` to dispatch `IELTS_TEST_SUBMITTED`.
     - **For Writing:** Programmatically calls `window.submitTest()` or directly collects `ielts-writing-part-1` / `ielts-writing-part-2` from `localStorage`/DOM, dispatches `IELTS_TEST_SUBMITTED`, and cleans up storage.
   - Displays student notification toast: *"Vaqt tugadi! Test avtomatik tarzda topshirildi"* (localized via `i18n`).

4. **Visual Warning States:**
   - Remaining > 5 mins: Normal display (`#374151`).
   - 5 mins to 1 min: Amber warning with pulse effect (`#d97706 font-weight: 700`).
   - Last 60 seconds: Red alert (`#dc2626 font-weight: 800 animate-pulse`).

---

### 2.4 Results & Leaderboard Export to Excel & PDF

#### 2.4.1 Requirements
- **Target Views:**
  - Group Statistics page: [GroupStatisticsPage.tsx](file:///d:/teacher-student-platform/frontend/src/features/teacher/GroupStatisticsPage.tsx)
  - Student Detail page: [GroupStudentsPage.tsx](file:///d:/teacher-student-platform/frontend/src/features/teacher/GroupStudentsPage.tsx)
- **Export Formats:**
  1. **Excel (`.xlsx`):** Formatted via `xlsx-js-style` with colored headers, proper column widths, and cell borders.
  2. **PDF (`.pdf`):** Clean printable table containing center logo, group name, teacher name, date, and student ranking.
- **Export Data Fields:**
  - Rank (`#`), Student Name (`Familiya Ism`), Login (`Username`), Group (`Guruh`), Section (`Modul: R/L/W/S`), Task Title (`Topshiriq nomi`), Score (`Ball`), Band (`IELTS Band`), Attempt (`Urinish`), Date (`Topshirilgan vaqt`).
- **Backend Endpoints:**
  - `GET /groups/:groupId/statistics/export?format=xlsx|pdf`
  - `GET /groups/:groupId/leaderboard/export?format=xlsx|pdf`

---

### 2.5 User Profile & Self-Service Password Change

#### 2.5.1 Requirements
- **User Settings Modal / Dropdown:**
  - Accessible from the user profile avatar in the sidebar footer across all roles (`SUPER_ADMIN`, `TEACHER`, `STUDENT`).
- **Profile Fields:**
  - Display Username, Role, Full Name.
  - Option to update First Name and Last Name.
- **Password Change Form:**
  - Fields: `currentPassword` (Old password), `newPassword` (Min 6 chars), `confirmPassword`.
  - Validation: Verify `currentPassword` matches current bcrypt hash.
  - Update: Updates `passwordHash` and updates reversible `currentPassword` (AES encrypted) so teacher/admin rosters remain in sync if temporary passwords were used.
- **Backend Endpoints:**
  - `GET /auth/me` — Returns current authenticated user profile.
  - `PATCH /auth/profile` — Update first name / last name.
  - `POST /auth/change-password` — Verify old password and set new password.

---

### 2.6 Orphan User Cleanup on Group Deletion

#### 2.6.1 Problem Statement
When a group is deleted, Prisma's `Group.students` relation executes `onDelete: Cascade` on `StudentProfile`. However, `StudentProfile` belongs to `User`. The parent `User` record in the database is NOT automatically deleted by Postgres cascade rules, leaving behind "orphan" users with no profile.

#### 2.6.2 Solution
In [groups.service.ts](file:///d:/teacher-student-platform/backend/src/groups/groups.service.ts), modify the `remove(teacherProfileId, groupId)` method to perform an atomic transaction:
1. Find all `userId`s of students belonging to `groupId`.
2. Delete the group (cascading `StudentProfile`, `GroupTask`, `submissions`).
3. Delete all associated `User` records by `id: { in: userIds }`.
```typescript
await this.prisma.$transaction(async (tx) => {
  const students = await tx.studentProfile.findMany({
    where: { groupId },
    select: { userId: true },
  });
  const userIds = students.map((s) => s.userId);

  await tx.group.delete({ where: { id: groupId } });

  if (userIds.length > 0) {
    await tx.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }
});
```

---

### 2.7 Real-time JWT Invalidation & Active Status Verification

#### 2.7.1 Problem Statement
`JwtStrategy.validate(payload)` currently returns `payload` directly without checking the database. If a Super Admin deactivates a teacher (`isActive = false`), their existing JWT token continues to work for 8 hours.

#### 2.7.2 Solution
In [jwt.strategy.ts](file:///d:/teacher-student-platform/backend/src/auth/strategies/jwt.strategy.ts):
- Check `user.isActive` in the database (or cache):
```typescript
async validate(payload: JwtPayload): Promise<JwtPayload> {
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    select: { isActive: true },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedException({
      errorCode: ERROR_CODES.ACCOUNT_DEACTIVATED,
      message: 'Account is deactivated or not found',
    });
  }

  return payload;
}
```

---

### 2.8 Prisma Service Unit Test Resilience

#### 2.8.1 Problem Statement
[prisma.service.spec.ts](file:///d:/teacher-student-platform/backend/src/common/prisma/prisma.service.spec.ts) instantiates a real `new PrismaService()` and attempts to connect to a real PostgreSQL instance within a 5000ms Jest timeout. When running tests in CI or without an active database, it fails.

#### 2.8.2 Solution
Mock `$connect` and `$disconnect` in the unit test, and verify module lifecycle without relying on live network connectivity:
```typescript
describe('PrismaService', () => {
  it('connects and disconnects without throwing', async () => {
    const service = new PrismaService();
    jest.spyOn(service, '$connect').mockResolvedValue(undefined as never);
    jest.spyOn(service, '$disconnect').mockResolvedValue(undefined as never);

    await expect(service.onModuleInit()).resolves.not.toThrow();
    await expect(service.$disconnect()).resolves.not.toThrow();
  });
});
```

---

## 3. Implementation Phasing

| Phase | Items | Estimated Effort |
| :--- | :--- | :--- |
| **Phase 1: Security & Stability** | Orphan user deletion cleanup (2.6), JWT active status check (2.7), Prisma test fix (2.8) | Low |
| **Phase 2: User Settings & Exports** | Change password & profile (2.5), Excel/PDF Results export (2.4) | Medium |
| **Phase 3: Assessment & Timing** | Exam timer & auto-submit (2.3), Writing grading & review interface (2.2) | Medium-High |
| **Phase 4: Speaking Module** | Audio recorder, prompt runner, submission & teacher audio review (2.1) | High |

---

## 4. Verification & Testing Plan
1. **Unit Tests:**
   - Verify `JwtStrategy` rejects deactivated users.
   - Verify group removal deletes both profiles and login credentials.
   - Verify Prisma service test completes in <100ms.
2. **Integration & E2E:**
   - Teacher grading updates student submission and reflects on leaderboard.
   - Timer auto-submits on `00:00` without losing entered answers.
   - Speaking recorder produces playable audio on Chrome, Safari, and Firefox.
   - Excel and PDF exports download with valid mime-types and correct student scores.
