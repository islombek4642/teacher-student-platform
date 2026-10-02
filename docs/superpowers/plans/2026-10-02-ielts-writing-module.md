# IELTS Writing Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a production-grade IELTS Writing module mirroring the existing Reading and Listening features, with support for uploading the 23 HTML tests in `dataset/Writing/`, live taking, word counting, submission, read-only review mode, and group assignment.

**Architecture:** Extend backend `ielts.service.ts` to detect `WRITING` tests, sanitize third-party branding (`@MINDLESS_WRITER`, Telegram links), normalize headers, and inject writing-specific submission & review scripts. Implement `WritingPage.tsx` with identical UI/UX to `ReadingPage.tsx` (table, pagination, bulk delete with 2-step confirmation, viewer modal). Update `UploadIeltsDialog.tsx` for `WRITING` type validation and title extraction. Integrate `WRITING` filter across teacher group assignments and student results.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vite, NestJS, Prisma, PostgreSQL, Vitest, Testing Library.

**Spec:** [docs/superpowers/specs/2026-10-02-ielts-writing-module-design.md](file:///d:/teacher-student-platform/docs/superpowers/specs/2026-10-02-ielts-writing-module-design.md)

## Global Constraints
- Target files from `dataset/Writing/` (23 files: `01-writing.html` to `23-writing.html`) must load and run seamlessly without external desktop download dialogs.
- `WritingPage.tsx` must maintain identical visual and functional parity with `ReadingPage.tsx` and `ListeningPage.tsx` (10 items per page, keyboard navigation, empty row placeholders, 2-step delete confirmation).
- Preserves all existing comments, docstrings, and tests in `ReadingPage` and `ListeningPage`.
- All tests must pass: `npm run test` in `frontend/` and `npm run test` in `backend/`.

## Review Focus
1. **Writing Task Type Detection:** HTML files containing `writing-textarea`, `writing-part`, or `<title>IELTS Writing` must be recognized as `WRITING` and not misclassified as `UNKNOWN` or `READING`.
2. **Review Mode Pre-Population:** In review mode, textareas must be locked read-only and filled with student's submitted Part 1 and Part 2 essays.
3. **Third-party Watermark Removal:** The `@MINDLESS_WRITER` watermark and Telegram buttons present in `01-writing.html` through `23-writing.html` must be stripped on view.
4. **Active Usage Protection:** Deleting writing tasks assigned to groups or with student submissions must trigger the secondary warning confirm dialog before deletion.
5. **Group Assignment Filtering:** Teachers must be able to filter and assign `WRITING` tasks inside `AssignTaskDialog.tsx` and `GroupTasksPage.tsx`.

---

### Task 1: Backend Writing Detection, Normalization & Injected Runtime

**Files:**
- Modify: `backend/src/ielts/ielts.service.ts`
- Test: `backend/src/ielts/ielts.service.spec.ts`

**Interfaces:**
- Consumes: `IeltsTaskType.WRITING` from `@prisma/client`, `IeltsTask` and `IeltsSubmission` entities.
- Produces: `detectIeltsTaskType(html)` returning `IeltsTaskType.WRITING`, `getTask()` stripping watermarks, normalizing headers, and injecting `IELTS_WRITING_SUBMISSION_SCRIPT` or `buildWritingReviewModeScript()`.

- [ ] **Step 1: Write unit tests for writing type detection and HTML cleanup in `backend/src/ielts/ielts.service.spec.ts`**

```typescript
import { detectIeltsTaskType } from './ielts.service';
import { IeltsTaskType } from '@prisma/client';

describe('detectIeltsTaskType (Writing)', () => {
  it('detects WRITING from writing-textarea and writing-part markers', () => {
    const html = `<!DOCTYPE html><html><head><title>IELTS Writing Test</title></head><body><div class="writing-part" id="part-1"><textarea id="writingTextarea" class="writing-textarea"></textarea></div></body></html>`;
    expect(detectIeltsTaskType(html)).toBe(IeltsTaskType.WRITING);
  });

  it('detects WRITING from task-header and localStorage part markers', () => {
    const html = `<html><body><div id="part-header-1" class="part-header"><p>Part 1</p></div><script>localStorage.getItem('ielts-writing-part-1')</script></body></html>`;
    expect(detectIeltsTaskType(html)).toBe(IeltsTaskType.WRITING);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix backend test -- -t "detectIeltsTaskType (Writing)"`
Expected: FAIL (returns UNKNOWN or fails type match).

- [ ] **Step 3: Implement Writing detection and injection scripts in `backend/src/ielts/ielts.service.ts`**

```typescript
// Add WRITING detection in detectIeltsTaskType
export function detectIeltsTaskType(contentHtml: string): IeltsTaskType | 'UNKNOWN' {
  const hasWritingMarkers =
    /writing-textarea/i.test(contentHtml) ||
    /class=["'][^"']*writing-part[^"']*["']/i.test(contentHtml) ||
    /id=["']part-header-[12]["']/i.test(contentHtml) ||
    /ielts-writing-part-[12]/i.test(contentHtml) ||
    /<title>[^<]*writing[^<]*<\/title>/i.test(contentHtml);

  if (hasWritingMarkers) {
    return IeltsTaskType.WRITING;
  }
  // existing reading/listening checks ...
}
```

Implement `IELTS_WRITING_SUBMISSION_SCRIPT`:
- Intercepts `#deliver-button` or `submitTest()`.
- Reads `localStorage.getItem('ielts-writing-part-1')` or current textarea value.
- Reads `localStorage.getItem('ielts-writing-part-2')` or current textarea value.
- Computes `part1Words`, `part2Words`, and `totalWords`.
- Dispatches `window.parent.postMessage({ type: 'IELTS_TEST_SUBMITTED', payload: { score: totalWords, total: 400, band: 0, results: [{ question: 'Task 1', userAnswer: part1, wordCount: p1Count }, { question: 'Task 2', userAnswer: part2, wordCount: p2Count }] } }, '*')`.

Implement `buildWritingReviewModeScript(submission)`:
- Sets textareas to `disabled = true` and `readOnly = true`.
- Populates Task 1 answer and Task 2 answer on part switch.
- Strips `@MINDLESS_WRITER` watermark: `task.contentHtml = task.contentHtml.replace(/body::after\s*\{[\s\S]*?\}/gi, '');`.

- [ ] **Step 4: Run backend tests to verify pass**

Run: `npm --prefix backend test -- -t "detectIeltsTaskType"`
Expected: PASS.

- [ ] **Step 5: Commit backend changes**

```bash
git add backend/src/ielts/ielts.service.ts backend/src/ielts/ielts.service.spec.ts
git commit -m "feat(backend): add IELTS writing task detection, cleanup, and runtime injection"
```

---

### Task 2: Frontend Writing Type Detection & Upload Dialog

**Files:**
- Modify: `frontend/src/features/ielts/UploadIeltsDialog.tsx`
- Modify: `frontend/src/features/ielts/UploadIeltsDialog.test.tsx`

**Interfaces:**
- Consumes: `detectIeltsTaskType`, `extractTaskTitle`.
- Produces: Seamless single and bulk upload for `WRITING` type, with mismatch validation.

- [ ] **Step 1: Write unit tests in `frontend/src/features/ielts/UploadIeltsDialog.test.tsx`**

```typescript
import { detectIeltsTaskType, extractTaskTitle } from './UploadIeltsDialog';

describe('detectIeltsTaskType (Writing)', () => {
  it('identifies writing html as WRITING', () => {
    const html = `<!DOCTYPE html><html><head><title>IELTS Writing Test</title></head><body><div class="writing-part"><textarea class="writing-textarea" id="writingTextarea"></textarea></div></body></html>`;
    expect(detectIeltsTaskType(html)).toBe('WRITING');
  });

  it('extracts task title from writing prompt or clean filename', () => {
    const html = `<div class="task-prompt"><p><strong>The provided chart illustrates the percentage of visitors...</strong></p></div>`;
    const title = extractTaskTitle(html, '01-writing.html');
    expect(title).toBe('The provided chart illustrates the percentage of visitors...');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test -- UploadIeltsDialog.test.tsx`
Expected: FAIL (detectIeltsTaskType returns UNKNOWN for writing).

- [ ] **Step 3: Implement WRITING detection & type validation in `frontend/src/features/ielts/UploadIeltsDialog.tsx`**

Update `detectIeltsTaskType`:
```typescript
export function detectIeltsTaskType(contentHtml: string): 'LISTENING' | 'READING' | 'WRITING' | 'UNKNOWN' {
  const hasWritingMarkers =
    /writing-textarea/i.test(contentHtml) ||
    /class=["'][^"']*writing-part[^"']*["']/i.test(contentHtml) ||
    /id=["']part-header-[12]["']/i.test(contentHtml) ||
    /ielts-writing-part-[12]/i.test(contentHtml) ||
    /<title>[^<]*writing[^<]*<\/title>/i.test(contentHtml);

  if (hasWritingMarkers) {
    return 'WRITING';
  }
  // existing reading/listening checks ...
}
```

Update type mismatch validation:
```typescript
const isMismatch =
  (type === 'LISTENING' && (detected === 'READING' || detected === 'WRITING')) ||
  (type === 'READING' && (detected === 'LISTENING' || detected === 'WRITING')) ||
  (type === 'WRITING' && (detected === 'LISTENING' || detected === 'READING'));
```

Update `extractTaskTitle` to extract prompt text from `.task-prompt strong` if available or fallback to clean filename e.g. `01-writing.html` -> `01 writing`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test -- UploadIeltsDialog.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit frontend upload changes**

```bash
git add frontend/src/features/ielts/UploadIeltsDialog.tsx frontend/src/features/ielts/UploadIeltsDialog.test.tsx
git commit -m "feat(frontend): support WRITING type detection and validation in UploadIeltsDialog"
```

---

### Task 3: WritingPage Component Implementation

**Files:**
- Modify: `frontend/src/features/ielts/WritingPage.tsx`
- Create: `frontend/src/features/ielts/WritingPage.test.tsx`

**Interfaces:**
- Consumes: `useIeltsTasks()`, `useBulkDeleteIeltsTasks()`, `useStudentMySubmissions()`, `useAuth()`, `IeltsTaskViewer`, `UploadIeltsDialog`, `ConfirmDialog`.
- Produces: Full interactive Writing test management and taking view matching `ReadingPage` and `ListeningPage`.

- [ ] **Step 1: Write comprehensive component tests in `frontend/src/features/ielts/WritingPage.test.tsx`**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WritingPage } from './WritingPage';
import { useIeltsTasks, useBulkDeleteIeltsTasks } from './api/ielts.api';
import { useAuth } from '@/auth/useAuth';
import { useStudentMySubmissions } from '@/features/student/api/student-results.api';

vi.mock('./api/ielts.api');
vi.mock('@/auth/useAuth');
vi.mock('./UploadIeltsDialog', () => ({
  UploadIeltsDialog: () => <div data-testid="upload-dialog" />,
}));
const mockIeltsTaskViewer = vi.fn();
vi.mock('./IeltsTaskViewer', () => ({
  IeltsTaskViewer: (props: any) => {
    mockIeltsTaskViewer(props);
    return <div data-testid="ielts-task-viewer" data-mode={props.mode} />;
  },
}));
vi.mock('@/features/student/api/student-results.api', () => ({
  useStudentMySubmissions: vi.fn(() => ({ data: [] })),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => {
      if (key === 'common.totalCount' && opts?.count !== undefined) {
        return `Jami: ${opts.count} ta`;
      }
      return opts?.defaultValue || key;
    },
  }),
}));

describe('WritingPage', () => {
  beforeEach(() => {
    vi.mocked(useBulkDeleteIeltsTasks).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  it('renders table headers with # numbering column and sequential numbers', () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    const mockTasks = [
      { id: '1', title: 'Writing Task 1', type: 'WRITING', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: '2', title: 'Writing Task 2', type: 'WRITING', createdAt: '2026-09-02T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    render(<WritingPage />);

    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Writing Task 1')).toBeInTheDocument();
    expect(screen.getByText('Writing Task 2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('allows teacher to select tasks and triggers bulk delete confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    const mockTasks = [
      { id: 'task-1', title: 'Writing Task 1', type: 'WRITING', createdAt: '2026-09-01T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    render(<WritingPage />);

    const checkboxes = screen.getAllByRole('cell');
    await user.click(checkboxes[0]); // click checkbox cell
    expect(screen.getByText(/1 ta topshiriq tanlandi/i)).toBeInTheDocument();
  });

  it('shows student Boshlash button when not submitted and opens viewer', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'STUDENT', userId: 's1' },
    } as any);

    const mockTasks = [
      { id: 'task-1', title: 'Writing Task 1', type: 'WRITING', createdAt: '2026-09-01T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    render(<WritingPage />);

    const startBtn = screen.getByRole('button', { name: /Boshlash/i });
    expect(startBtn).toBeInTheDocument();
    await user.click(startBtn);
    expect(screen.getByTestId('ielts-task-viewer')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix frontend test -- WritingPage.test.tsx`
Expected: FAIL (WritingPage currently returns "Coming Soon").

- [ ] **Step 3: Implement `frontend/src/features/ielts/WritingPage.tsx`**

Implement complete `WritingPage` matching `ReadingPage` structure:
- `const writingTasks = tasks?.filter((t) => t.type === 'WRITING') || [];`
- Table layout with 10 items per page, keyboard navigation, row checkbox selection, select all total.
- Active usage stats check: `isInUse` if `groupsCount > 0 || submissionsCount > 0`.
- Two-step ConfirmDialog for bulk deletion.
- Student badge: if `submissionsMap.has(task.id)` show `Badge` with `Topshirildi` and check icon.
- `UploadIeltsDialog` with `type="WRITING"`.
- `IeltsTaskViewer` for taking and review.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix frontend test -- WritingPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit WritingPage implementation**

```bash
git add frontend/src/features/ielts/WritingPage.tsx frontend/src/features/ielts/WritingPage.test.tsx
git commit -m "feat(frontend): implement full IELTS WritingPage with parity to Reading and Listening"
```

---

### Task 4: Group Assignment & Student Dashboards Integration

**Files:**
- Modify: `frontend/src/features/teacher/AssignTaskDialog.tsx`
- Modify: `frontend/src/features/teacher/GroupTasksPage.tsx`
- Modify: `frontend/src/features/student/StudentResultsPage.tsx`
- Modify: `frontend/src/features/student/StudentDashboardPage.tsx`

**Interfaces:**
- Consumes: Task types including `'WRITING'`.
- Produces: Group assignment filter tabs with `'WRITING'`, student results filtered by `'WRITING'`.

- [ ] **Step 1: Write test for AssignTaskDialog WRITING filter**

In `frontend/src/features/teacher/AssignTaskDialog.tsx`, check that filterType supports `'ALL' | 'LISTENING' | 'READING' | 'WRITING'`.
Run: `npm --prefix frontend test -- AssignTaskDialog.test.tsx`

- [ ] **Step 2: Update `AssignTaskDialog.tsx` and `GroupTasksPage.tsx`**

- In `AssignTaskDialog.tsx`:
  - Change `filterType` type to `'ALL' | 'LISTENING' | 'READING' | 'WRITING'`.
  - Add Writing filter button:
    ```tsx
    <Button
      variant={filterType === 'WRITING' ? 'default' : 'outline'}
      size="sm"
      onClick={() => setFilterType('WRITING')}
    >
      {t('ielts.writing')}
    </Button>
    ```
- In `GroupTasksPage.tsx`:
  - Change `typeFilter` type to `'ALL' | 'LISTENING' | 'READING' | 'WRITING'`.
  - Add Writing filter button.

- In `StudentResultsPage.tsx`:
  - Change `selectedType` to `'ALL' | 'LISTENING' | 'READING' | 'WRITING'`.
  - Add Writing filter button and stats calculations for writing tasks.

- In `StudentDashboardPage.tsx`:
  - Count writing tasks: `tasks?.filter((tk) => tk.type === 'WRITING').length`.
  - Show writing badge with `lucide:pen-tool` in marquee card when `sub.task?.type === 'WRITING'`.

- [ ] **Step 3: Run frontend tests across all touched components**

Run: `npm --prefix frontend test`
Expected: ALL PASS.

- [ ] **Step 4: Commit integration changes**

```bash
git add frontend/src/features/teacher/AssignTaskDialog.tsx frontend/src/features/teacher/GroupTasksPage.tsx frontend/src/features/student/StudentResultsPage.tsx frontend/src/features/student/StudentDashboardPage.tsx
git commit -m "feat(frontend): integrate WRITING filter in group task assignments and student dashboards"
```

---

### Task 5: Dataset Files Ingestion & Full Verification

**Files:**
- Test all 23 files in `dataset/Writing/` against `detectIeltsTaskType` and `extractTaskTitle`.
- Frontend linting & build verification.

- [ ] **Step 1: Run comprehensive tests on both backend and frontend**

Run: `npm --prefix backend test`
Run: `npm --prefix frontend test`
Run: `npm --prefix frontend run build`

- [ ] **Step 2: Verify zero lint/type errors**

Run: `npx --prefix frontend oxlint`
Expected: 0 errors.

- [ ] **Step 3: Final Git Commit**

```bash
git commit --allow-empty -m "chore: verify IELTS writing module implementation and tests"
```
