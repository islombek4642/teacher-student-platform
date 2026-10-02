# IELTS Writing Module Technical Design Specification

## 1. Overview
The Teacher-Student Platform currently provides full IELTS test workflows for **Reading** and **Listening** sections (HTML-based tasks, single & bulk uploads, question viewers with auto-submission, review mode, group assignments, and result tracking).
The **Writing** section currently contains a placeholder "Coming Soon" card in `WritingPage.tsx`.

This project implements a complete, production-grade **Writing** section that mirrors `ReadingPage.tsx` and `ListeningPage.tsx` in UI, functionality, and student/teacher interactions. It utilizes the 23 ready-to-use HTML test files stored in `dataset/Writing/` (from `01-writing.html` to `23-writing.html`), normalizes their HTML/branding, handles test taking in `IeltsTaskViewer`, persists essay submissions in `IeltsSubmission`, provides read-only Review Mode with submitted text pre-population, and integrates with group assignment and student result dashboards.

---

## 2. Requirements & Behavior

### 2.1 Teacher & Admin Features (`WritingPage.tsx`)
- **Header & Navigation:**
  - Page title `t('ielts.writing')`.
  - For Teachers & Super Admins: **Upload Task** button (`UploadIeltsDialog` opened with `type="WRITING"`).
- **Task Table:**
  - Row numbering column `#` (1-indexed, calculated across pagination: `(safePage - 1) * PAGE_SIZE + index + 1`).
  - Row checkboxes for bulk selection (Teacher/Admin only).
  - Select all current page checkbox in table header with indeterminate icon support.
  - **Task Title**: Name of the writing task.
  - **Uploaded Date**: Formatted time and date (e.g., `14:30 • 02.10.2026`).
  - **Actions Column**:
    - **Preview / Ko'rish**: Opens `IeltsTaskViewer` in preview mode.
- **Bulk Selection Bar:**
  - Appears when 1 or more rows are selected.
  - Shows selected count: `X ta topshiriq tanlandi`.
  - "Barcha X ta topshiriqni tanlash" button to select all tasks across all pages.
  - "Tanlovni bekor qilish" (Deselect all) button.
  - "O'chirish (X)" (Delete selected) button with `lucide:trash-2`.
- **2-Step Safe Delete Dialogs:**
  - **Step 1:** Initial confirmation dialog (`ConfirmDialog`).
  - **Step 2:** Active usage warning dialog if any selected tasks are currently assigned to groups or have student submissions.
- **Pagination:**
  - `PAGE_SIZE = 10`.
  - Empty placeholder rows to maintain uniform table height.
  - Keyboard navigation (ArrowLeft / ArrowRight) via `usePaginationKeyboard`.
- **Empty State:**
  - Displays `lucide:pen-tool` and `ielts.emptyTasks`.

### 2.2 Student Experience (`WritingPage.tsx` & `IeltsTaskViewer.tsx`)
- **Status & Indicators:**
  - If unattempted: Action button displays **"Boshlash"** (primary button).
  - If submitted: Displays green badge `Topshirildi` with checkmark icon and word count summary. Action button displays **"Ko'rish"** (outline button).
- **Test Taking (Take Mode):**
  - Full-screen iframe running `${API_URL}/ielts/${taskId}/view`.
  - Left panel: Task prompt, instructions, and chart/graph image (for Task 1) or essay question (for Task 2).
  - Right panel: `#writingTextarea` with live word counter (target: 150 words for Task 1, 250 words for Task 2).
  - Bottom navigation bar: Switch between Part 1 and Part 2 tabs; completed indicator highlights when word targets are met.
  - Top header: Normalized layout containing 60-minute countdown timer on left and red "Exit" button in center.
  - Auto-saving: Text is continuously saved so refreshing the page does not cause data loss.
  - Submission: Clicking `#deliver-button` collects:
    - Task 1 content and word count.
    - Task 2 content and word count.
    - Total word count.
    - Dispatches postMessage `IELTS_TEST_SUBMITTED` to parent window.
    - Parent window stores submission via `useSubmitIeltsTask()`, updates state, and shows success toast.
- **Review Mode:**
  - Loaded via `${API_URL}/ielts/${taskId}/view?mode=review&submissionId=...`.
  - Textareas are locked (`disabled = true`, read-only).
  - The student's submitted Task 1 and Task 2 answers are automatically populated into the respective textareas.
  - Word count counters show the submitted word counts.
  - Top center displays **"Review Mode"** badge and **"Retake"** button to start a fresh attempt if desired.
  - Pressing `Escape` or clicking `Exit` safely closes the viewer.

### 2.3 Upload Dialog & Type Detection (`UploadIeltsDialog.tsx`)
- Supports `type="WRITING"`.
- **Auto-Detection (`detectIeltsTaskType`):**
  - Examines HTML for signatures:
    - `id="writingTextarea"` / `.writing-textarea`
    - `.writing-part` / `id="part-1"` / `id="part-2"`
    - `id="part-header-1"` / `id="part-header-2"`
    - `ielts-writing-part-1`
    - `<title>` containing "writing"
  - Returns `'WRITING'`.
- **Type Mismatch Validation:**
  - Prevents uploading a `READING` or `LISTENING` HTML file when in the Writing dialog (and vice versa), showing an explicit localized error message.
- **Title Extraction (`extractTaskTitle`):**
  - Extracts prompt summary or clean filename formatted as e.g. "Writing Practice Test 01".
  - Allows inline editing before submitting.
  - Supports single and multiple drag & drop / multi-file selection.

### 2.4 HTML Normalization & Injection (`backend/src/ielts/ielts.service.ts`)
- **Branding & Watermark Cleanup:**
  - Strips `@MINDLESS_WRITER` watermark (`body::after` CSS rule).
  - Strips external Telegram buttons (`<a href="https://t.me/...">...</a>`).
  - Removes default browser file download scripts (`saveWritingToFile`).
- **Header Normalization:**
  - Utilizes `normalizeIeltsHeader()`:
    - Left zone: 60:00 timer (`.timer-container`).
    - Center zone: Red `Exit` button, `Retake` button (if review mode), `Review Mode` badge.
    - Right zone: spacing.
- **Writing Submission Script Injection:**
  - Wraps `#deliver-button` and writing submission handler:
    - Extracts `part1Content` and `part2Content` from textareas/localStorage.
    - Computes `part1WordCount`, `part2WordCount`, and `totalWords`.
    - Dispatches `IELTS_TEST_SUBMITTED` postMessage with results.
- **Writing Review Mode Script Injection:**
  - Injects script when `mode === 'review'` and `task.type === 'WRITING'`:
    - Disables textareas.
    - Populates Task 1 and Task 2 student answers from `submission.answersJson`.
    - Triggers `updateWordCount()` and completion indicators.

### 2.5 Group Assignments & Student Results Integration
- **`AssignTaskDialog.tsx` & `GroupTasksPage.tsx`:**
  - Add `'WRITING'` to `filterType` options (`'ALL' | 'LISTENING' | 'READING' | 'WRITING'`).
  - Allow teachers to filter and assign Writing tasks to groups.
- **`StudentResultsPage.tsx` & `StudentDashboardPage.tsx`:**
  - Add `'WRITING'` filter to submission lists.
  - Show student's submitted writing attempts and allow opening in Review Mode.

---

## 3. Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
| Teacher Uploads (01-writing.html ... 23-writing.html)                             |
|                                                                                   |
|  [UploadIeltsDialog (type="WRITING")]                                             |
|        |                                                                          |
|        +--> detectIeltsTaskType() -> 'WRITING'                                    |
|        +--> extractTaskTitle() -> "Writing Practice Test 01"                      |
|        +--> POST /ielts/upload (multipart)                                        |
|                 |                                                                 |
|                 v                                                                 |
|           [Prisma: IeltsTask { type: WRITING, contentHtml }]                      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| Student or Teacher opens Writing Test                                             |
|                                                                                   |
|  [WritingPage.tsx] -> [IeltsTaskViewer.tsx] -> iframe: GET /ielts/:id/view        |
|                                                      |                            |
|                                 [backend: getTask()]                              |
|                                 - Strips watermarks & Telegram links              |
|                                 - Normalizes Header (Exit, Timer, Review Badge)   |
|                                 - Injects Writing Submission or Review Script     |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| Test Submission & Review Flow                                                     |
|                                                                                   |
|  Student clicks #deliver-button -> Injected script collects Part 1 & Part 2 essays|
|        |                                                                          |
|        +--> window.parent.postMessage('IELTS_TEST_SUBMITTED', payload)            |
|        |                                                                          |
|        v                                                                          |
|  [IeltsTaskViewer.tsx] -> POST /ielts/:id/submit                                  |
|        |                                                                          |
|        v                                                                          |
|  [Prisma: IeltsSubmission { taskId, answersJson: [Task 1, Task 2], band: 0 }]    |
|        |                                                                          |
|        v                                                                          |
|  Subsequent Open in Review Mode -> Textareas populated, locked read-only          |
+-----------------------------------------------------------------------------------+
```

---

## 4. Testing & Verification Plan

1. **Unit & Component Tests:**
   - Create `WritingPage.test.tsx` mirroring `ReadingPage.test.tsx` and `ListeningPage.test.tsx`:
     - Test table headers, `#` sequential numbering column.
     - Test pagination and page switching with keyboard shortcuts.
     - Test bulk row selection, select all total, deselect all.
     - Test teacher upload button opening dialog.
     - Test student "Boshlash" and "Ko'rish" button triggers.
   - Update `UploadIeltsDialog.test.tsx`:
     - Test `detectIeltsTaskType` with writing HTML content.
     - Test type mismatch error when uploading writing file to reading/listening or vice versa.
2. **Backend Tests:**
   - Verify `ielts.service.ts` unit tests for `detectIeltsTaskType` and `getTask` with Writing task type.
3. **E2E & Linting Validation:**
   - Run `npm run test` or `npx vitest run` in `frontend/`.
   - Run lint checks (`npx oxlint` / `npm run build`).
