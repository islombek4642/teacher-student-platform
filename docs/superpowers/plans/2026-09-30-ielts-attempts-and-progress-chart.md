# IELTS Test Attempts, Progress Trend Charts & Review Mode Implementation Plan

> **Goal:** Support multiple attempts per test for students with visual progress charts (Recharts), expandable row history on the results page, attempt modal on the dashboard, and a protected read-only review mode.

---

## 1. Database & Backend Architecture
- **Prisma Schema (`schema.prisma`):**
  - Add `attempt Int @default(1)` to `IeltsSubmission`.
  - Replace `@@unique([studentId, taskId])` with `@@unique([studentId, taskId, attempt])`.
  - Add index `@@index([studentId, taskId])`.
  - Run migration `add_submission_attempt_number`.
- **Backend Service (`ielts.service.ts` & `ielts.controller.ts`):**
  - `submitTask`:
    - Calculate `attempt`: Query highest attempt for `(studentId, taskId)`, increment by 1.
    - Create new `IeltsSubmission` record.
  - `getTaskAttempts(studentUserId, taskId)`:
    - Return all attempts for student and task ordered by `attempt: asc`.
  - `getMySubmissions`:
    - Return submissions with attempt count and best band / latest attempt.
  - Group Statistics & Leaderboard:
    - Aggregate by student's **highest band** (best attempt) so retakes positively reward students.
  - Review Mode in `getTask(taskId, mode)`:
    - If `mode === 'review'`, inject `IELTS_REVIEW_MODE_SCRIPT` that disables all inputs, hides submit buttons, and triggers instant answer checking for read-only error review.

---

## 2. Frontend UI/UX Architecture
- **Read-Only Review Mode (`IeltsTaskViewer.tsx`):**
  - Accept `mode?: 'take' | 'review'`.
  - Pass `?mode=review` when viewing past attempts.
  - Show "Ko'rish rejimi (Read-only)" banner; prevent submission mutation dispatch.
  - Add a "Qayta yechish" (Retake) button in viewer or dialog when review is complete.
- **Expandable Row with Progress Chart (`StudentResultsPage.tsx`):**
  - Group submissions by task (showing highest band and latest date by default).
  - Clicking a row expands an accordion section featuring:
    - **Recharts AreaChart / LineChart** (Attempt 1 -> Attempt 2 -> Attempt 3, showing Band improvement gradient).
    - **Attempts List**: Date, Score, Band badge, and "Ko'rish" (Review) button for each attempt.
    - **"Qayta yechish" (Retake Test)** button to launch test in `mode="take"`.
- **Dashboard Modal (`StudentDashboardPage.tsx`):**
  - Clicking a recent submission card opens an **Attempt History Modal** (`AttemptHistoryDialog.tsx`) with:
    - Mini Recharts progress chart.
    - List of attempts with score, date, and Review button.
    - Retake button.

---

## 3. Verification & Testing
- Backend unit tests (`ielts.service.spec.ts`, `groups.service.spec.ts`).
- Frontend vitest tests for `StudentResultsPage.test.tsx`, `StudentDashboardPage.test.tsx`, and `IeltsTaskViewer.test.tsx`.
- Production build `tsc -b && vite build`.
