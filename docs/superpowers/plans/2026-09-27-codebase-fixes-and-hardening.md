# Codebase Hardening and Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the IELTS task exit modal visibility bug, secure and harden file uploads and endpoints, replace remaining native `window.confirm` dialogs with UI modals, centralize constants, and add brute-force protection to authentication.

**Architecture:** 
1. Fix z-index stacking in IELTS task viewer so the dialog renders above the iframe (`z-[100]`), and sanitize legacy `confirm()` calls on existing tasks in the database dynamically.
2. Standardize error handling in `IeltsService` to use `ERROR_CODES` and typed exceptions (`NotFoundException`, `BadRequestException`), and allow `SUPER_ADMIN` to manage IELTS tasks.
3. Add upload limits and file presence validations to Multer interceptors to prevent memory exhaustion and server crashes.
4. Extract Excel column headers and filenames into shared constants.
5. Introduce `@nestjs/throttler` rate limiting on `/auth/login` to protect 4-digit numeric passwords.
6. Replace `window.confirm` in `ReadingPage`, `ListeningPage`, `GroupsPage`, and `GroupStudentsPage` with a reusable or standard `Dialog` component.

**Tech Stack:** NestJS, TypeScript, Prisma, React 19, Tailwind CSS, Base UI Dialog, Vite.

**Spec:** Codebase audit findings and user bug report.

## Global Constraints

- No hardcoded UI strings; all texts must use i18next `t(...)` keys in `uz.json` and `en.json`.
- Strict typing: do not use `any` when types can be inferred or defined.
- Existing tests must remain green; new tests should verify fixes.
- No breaking changes to existing API response contracts.

## Review Focus

1. IELTS Exit Dialog must be visually on top of the iframe and interactive when clicked.
2. Existing tasks with legacy `confirm(...)` HTML in the database must not trigger browser popups.
3. POST requests to Excel import or IELTS upload with empty body/no file must return a clean 400 Bad Request instead of throwing a 500 TypeError.
4. SUPER_ADMIN user must be able to delete any IELTS task without a 403 or server crash.
5. Bruteforce attempts on `/auth/login` must receive a 429 Too Many Requests response after exceeding limits.

---

### Task 1: Fix IELTS Exit Dialog Bug & Legacy HTML Sanitization

**Root Cause:**
- `IeltsTaskViewer.tsx` has `z-[100]`. The `@base-ui` Dialog Portal renders with `z-50` at the `body` level, meaning the modal is positioned underneath the iframe and completely invisible.
- Tasks already stored in the PostgreSQL database still contain `<button onclick="if(confirm(...)) ...">` in their `contentHtml`.

**Files:**
- Modify: `frontend/src/features/ielts/IeltsTaskViewer.tsx`
- Modify: `backend/src/ielts/ielts.service.ts`
- Test: `backend/src/ielts/ielts.service.spec.ts`

**Interfaces:**
- `IeltsTaskViewer`: Dialog overlay and popup must have `z-[110]` to appear over `z-[100]`.
- `IeltsService.getTask(id)`: strips any inline `confirm(...)` from `contentHtml` before serving.

- [x] **Step 1: Write backend unit test for legacy confirm sanitization in IELTS service**
- [x] **Step 2: Update `ielts.service.ts` to strip legacy confirm calls dynamically when viewing tasks**
- [x] **Step 3: Update `IeltsTaskViewer.tsx` to set `DialogContent` with higher z-index (`z-[110]`) so it renders in front of the iframe**
- [x] **Step 4: Verify in browser / build check**
- [x] **Step 5: Commit changes**

---

### Task 2: Standardize IELTS Error Codes, Controller Encapsulation & SUPER_ADMIN Permissions

**Root Cause:**
- `ielts.controller.ts` accesses `this.ieltsService['prisma']`.
- `ielts.controller.ts` delete endpoint only allows `Role.TEACHER` and expects `teacherProfile.id`, crashing if `SUPER_ADMIN` attempts to delete.
- `ielts.service.ts` throws `new Error('ERR_VALIDATION_FAILED')` instead of `BadRequestException({ errorCode: ERROR_CODES.VALIDATION_FAILED })`.

**Files:**
- Modify: `backend/src/ielts/ielts.controller.ts`
- Modify: `backend/src/ielts/ielts.service.ts`

- [x] **Step 1: Move teacherProfile resolution inside `IeltsService` methods to remove `this.ieltsService['prisma']` from controller**
- [x] **Step 2: Update `deleteTask` to accept `user: JwtPayload`, allowing `SUPER_ADMIN` to delete any task, and `TEACHER` to delete only their own**
- [x] **Step 3: Replace raw Error throws with `BadRequestException` and `NotFoundException` using `ERROR_CODES`**
- [x] **Step 4: Run backend build and verify**
- [x] **Step 5: Commit changes**

---

### Task 3: Harden File Uploads (Size Limits & Empty File Validation)

**Root Cause:**
- `FileInterceptor` has no `limits` set, allowing unbounded uploads that can exhaust memory.
- `groups.controller.ts` does not check if `file` exists before accessing `file.buffer`.

**Files:**
- Modify: `backend/src/groups/groups.controller.ts`
- Modify: `backend/src/ielts/ielts.controller.ts`
- Modify: `backend/src/common/constants/upload.constant.ts` (Create)

- [x] **Step 1: Create `backend/src/common/constants/upload.constant.ts` defining max file sizes (e.g., 5MB for HTML, 10MB for Excel)**
- [x] **Step 2: Configure `limits` in `FileInterceptor` in both controllers**
- [x] **Step 3: Add validation check in `groups.controller.ts` to return 400 if `file` or `file.buffer` is missing**
- [x] **Step 4: Run backend build and tests**
- [x] **Step 5: Commit changes**

---

### Task 4: Extract Excel & Export Constants

**Root Cause:**
- Column headers (`Ism`, `Familiya`, `Login`) and file names (`oqituvchilar.xlsx`, `guruhlar.xlsx`) are hardcoded string literals across multiple services and controllers.

**Files:**
- Create: `backend/src/common/constants/excel.constant.ts`
- Modify: `backend/src/teachers/teachers.controller.ts`
- Modify: `backend/src/teachers/teachers.service.ts`
- Modify: `backend/src/groups/groups.controller.ts`
- Modify: `backend/src/groups/groups.service.ts`

- [x] **Step 1: Define `EXCEL_COLUMNS` and `EXCEL_FILENAMES` constants**
- [x] **Step 2: Refactor `teachers.service.ts` and `teachers.controller.ts` to use constants**
- [x] **Step 3: Refactor `groups.service.ts` and `groups.controller.ts` to use constants**
- [x] **Step 4: Run backend build and verify**
- [x] **Step 5: Commit changes**

---

### Task 5: Add Rate Limiting to Prevent Brute-Force Attacks on 4-Digit Passwords

**Root Cause:**
- 4-digit passwords have only 9,000 combinations. Without rate limiting, `/auth/login` can be brute-forced quickly.

**Files:**
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/auth/auth.controller.ts`
- Modify: `backend/package.json`

- [x] **Step 1: Install `@nestjs/throttler` in backend**
- [x] **Step 2: Configure `ThrottlerModule` in `app.module.ts` (e.g. 10 requests per minute for login)**
- [x] **Step 3: Apply `@Throttle` or `ThrottlerGuard` to `auth.controller.ts` login route**
- [x] **Step 4: Verify rate limiting returns HTTP 429**
- [x] **Step 5: Commit changes**

---

### Task 6: Replace Native `window.confirm` with UI Dialog Modals in Remaining Frontend Pages

**Root Cause:**
- `ReadingPage`, `ListeningPage`, `GroupsPage`, and `GroupStudentsPage` still use native `window.confirm()` instead of the standard UI modal dialog.

**Files:**
- Modify: `frontend/src/features/ielts/ReadingPage.tsx`
- Modify: `frontend/src/features/ielts/ListeningPage.tsx`
- Modify: `frontend/src/features/teacher/GroupsPage.tsx`
- Modify: `frontend/src/features/teacher/GroupStudentsPage.tsx`

- [x] **Step 1: Add state and Dialog modal for task deletion in `ReadingPage.tsx`**
- [x] **Step 2: Add state and Dialog modal for task deletion in `ListeningPage.tsx`**
- [x] **Step 3: Add state and Dialog modal for group deletion in `GroupsPage.tsx`**
- [x] **Step 4: Add state and Dialog modal for student deletion in `GroupStudentsPage.tsx`**
- [x] **Step 5: Run frontend build and tests**
- [x] **Step 6: Commit changes**
