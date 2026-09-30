# IELTS Submissions, Group Tasks & Analytics Platform — Design Spec

**Date:** 2026-09-30  
**Status:** Approved  
**Topic:** IELTS Test Submissions, Group Task Assignment, and Teacher/Student Analytics  

---

## 1. Purpose & Scope

The Teacher-Student Platform currently allows teachers to manage groups and students, and upload/view IELTS Listening and Reading CDI tests in an iframe. However, the educational loop is disconnected: student test submissions, grading results, group task assignments, and performance analytics are neither persisted nor displayed.

This specification details the end-to-end design to:
1. Capture real-time auto-grading results from the IELTS test iframe via `postMessage`.
2. Persist student test attempts (`IeltsSubmission`) in PostgreSQL via Prisma.
3. Replace the placeholder "Tez kunda" in `GroupTasksPage` with full group task assignment and completion tracking.
4. Replace the placeholder "Tez kunda" in `GroupStatisticsPage` with group performance analytics and a student leaderboard.
5. Provide students with personal test history and band progress in their dashboard and task lists.

---

## 2. Architecture & Data Flow

```
+-------------------------------------------------------------------------------+
| Student Browser (IeltsTaskViewer / React 19)                                 |
|                                                                               |
|   +-----------------------------------------------------------------------+   |
|   | <iframe> IELTS CDI Test (HTML / JS)                                    |   |
|   |   1. Student completes questions 1..40                                |   |
|   |   2. checkAnswers() calculates score, band, resultsData               |   |
|   |   3. window.parent.postMessage('IELTS_TEST_SUBMITTED', payload)       |   |
|   +-----------------------------------+-----------------------------------+   |
|                                       | postMessage                           |
|   +-----------------------------------v-----------------------------------+   |
|   | React Parent Listener:                                                |   |
|   |   4. Receives event, invokes mutation                                 |   |
|   |   5. POST /ielts/:id/submit with JWT bearer token                     |   |
|   |   6. Shows localized success toast / modal and updates UI state       |   |
|   +-----------------------------------+-----------------------------------+   |
+---------------------------------------|---------------------------------------+
                                        | HTTP POST /ielts/:id/submit
+---------------------------------------v---------------------------------------+
| NestJS Backend                                                                |
|   1. JwtAuthGuard + RolesGuard verifies Role.STUDENT                          |
|   2. Looks up student's StudentProfile from user.sub                          |
|   3. Upserts/Creates IeltsSubmission record (score, band, answersJson)         |
|   4. Returns submission summary                                               |
+---------------------------------------+---------------------------------------+
                                        | Prisma ORM
+---------------------------------------v---------------------------------------+
| PostgreSQL Database (IeltsSubmission table)                                   |
+-------------------------------------------------------------------------------+
```

---

## 3. Data Model (Prisma Schema)

Add `IeltsSubmission` model and establish relations with `StudentProfile` and `IeltsTask`:

```prisma
model IeltsSubmission {
  id           String         @id @default(uuid())
  studentId    String
  taskId       String
  score        Int            // Correct answer count (e.g., 34 out of 40)
  total        Int            @default(40)
  band         Float          // IELTS Band score: 0.0 - 9.0 (e.g., 7.5)
  answersJson  Json           // Array of { question: string|number, userAnswer: string, correctAnswer: string, isCorrect: boolean }
  submittedAt  DateTime       @default(now())

  student      StudentProfile @relation(fields: [studentId], references: [id], onDelete: Cascade)
  task         IeltsTask      @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@unique([studentId, taskId])
  @@index([studentId])
  @@index([taskId])
}
```

Update `StudentProfile` and `IeltsTask` in `schema.prisma`:
```prisma
model StudentProfile {
  // ... existing fields ...
  submissions IeltsSubmission[]
}

model IeltsTask {
  // ... existing fields ...
  submissions IeltsSubmission[]
}
```

---

## 4. API Endpoints

### 4.1. IELTS Submissions (`/ielts`)

#### `POST /ielts/:taskId/submit`
- **Role:** `STUDENT`
- **Body:**
  ```json
  {
    "score": 34,
    "total": 40,
    "band": 7.5,
    "answers": [
      {
        "question": 1,
        "userAnswer": "C",
        "correctAnswer": "C",
        "isCorrect": true
      }
    ]
  }
  ```
- **Validation:** `class-validator` DTO (`IsNumber`, `Min(0)`, `Max(40)`, `IsArray`, `ArrayNotEmpty`).
- **Response (201 Created):**
  ```json
  {
    "id": "sub-uuid",
    "taskId": "task-uuid",
    "score": 34,
    "total": 40,
    "band": 7.5,
    "submittedAt": "2026-09-30T10:00:00.000Z"
  }
  ```
- **Error Codes:**
  - `404`: `ERR_TASK_NOT_FOUND`
  - `400`: `ERR_STUDENT_NOT_FOUND`

#### `GET /ielts/:taskId/my-submission`
- **Role:** `STUDENT`
- **Response (200 OK):** `IeltsSubmission` object if completed, or `null` if not attempted yet.

#### `GET /ielts/my-submissions`
- **Role:** `STUDENT`
- **Query:** optional pagination `?page=1&limit=10`
- **Response (200 OK):** List of student's completed tasks with task title, type, band, score, date.

---

### 4.2. Group Tasks (`/groups/:groupId/tasks`)

#### `GET /groups/:groupId/tasks`
- **Role:** `TEACHER`, `SUPER_ADMIN`
- **Description:** Returns tasks available to or assigned to this group, along with group submission statistics:
  - `id`, `title`, `type`, `createdAt`
  - `isAssigned`: boolean (whether task is assigned specifically to this group or global to teacher)
  - `submissionCount`: number of students in this group who submitted
  - `studentCount`: total active students in group
  - `averageBand`: average band score among students in this group

#### `POST /groups/:groupId/tasks/:taskId/assign`
- **Role:** `TEACHER` (group owner), `SUPER_ADMIN`
- **Description:** Assigns or unassigns task to group (sets `groupId = groupId` or `groupId = null`).

---

### 4.3. Group Statistics (`/groups/:groupId/statistics`)

#### `GET /groups/:groupId/statistics/overview`
- **Role:** `TEACHER` (group owner), `SUPER_ADMIN`
- **Response (200 OK):**
  ```json
  {
    "groupName": "IELTS Target 7.0",
    "totalStudents": 15,
    "totalSubmissions": 45,
    "averageBand": 6.8,
    "listeningAverageBand": 7.1,
    "readingAverageBand": 6.5,
    "completionRate": 82
  }
  ```

#### `GET /groups/:groupId/statistics/leaderboard`
- **Role:** `TEACHER` (group owner), `SUPER_ADMIN`
- **Response (200 OK):** Array of ranked students:
  ```json
  [
    {
      "studentId": "profile-uuid",
      "firstName": "Aziz",
      "lastName": "Karimov",
      "username": "azizk",
      "testsTaken": 6,
      "averageBand": 7.5,
      "bestBand": 8.0,
      "lastActive": "2026-09-30T09:30:00Z"
    }
  ]
  ```

#### `GET /groups/:groupId/statistics/tasks`
- **Role:** `TEACHER` (group owner), `SUPER_ADMIN`
- **Response (200 OK):** Per-task analytics in this group: completion count, average score, and lowest scoring questions.

---

## 5. Iframe Bridge Implementation

In `backend/src/ielts/ielts.service.ts`, the script injector dynamically injects a submission notifier into `task.contentHtml`:

```javascript
// Injected into iframe HTML:
(function() {
  const origCheckAnswers = window.checkAnswers;
  if (typeof origCheckAnswers === 'function') {
    window.checkAnswers = function() {
      const res = origCheckAnswers.apply(this, arguments);
      try {
        const scoreMatch = document.getElementById('score-summary')?.textContent || '';
        // Extract raw score and band
        window.parent.postMessage({
          type: 'IELTS_TEST_SUBMITTED',
          payload: {
            score: typeof score !== 'undefined' ? score : 0,
            total: typeof correctAnswers !== 'undefined' ? Object.keys(correctAnswers).length : 40,
            band: typeof band !== 'undefined' ? band : 0,
            results: typeof resultsData !== 'undefined' ? resultsData : []
          }
        }, '*');
      } catch (err) {
        console.error('Failed to notify parent window of submission', err);
      }
      return res;
    };
  }
})();
```

In `frontend/src/features/ielts/IeltsTaskViewer.tsx`:
- Listen for `e.data?.type === 'IELTS_TEST_SUBMITTED'`.
- If current user is `STUDENT`, trigger `useSubmitIeltsTask()` mutation.
- Invalidate queries: `['ielts-tasks']`, `['student-submissions']`, `['student-dashboard-stats']`.
- Display a success toast: `"Topshiriq muvaffaqiyatli topshirildi! Natijangiz: Band {band}"`.

---

## 6. Frontend Features & Components

### 6.1. `GroupTasksPage.tsx`
- Replaces the current placeholder card.
- **Top Bar**: Search filter, Task Type filter (`All`, `Listening`, `Reading`), "Topshiriq biriktirish" (Assign Task) dialog.
- **Table**:
  - `#`
  - Topshiriq nomi (Title)
  - Turi (Type badge: Listening purple / Reading emerald)
  - Guruhdagi topshirishlar (e.g., `12 / 15 o'quvchi`)
  - O'rtacha Band (`6.5 Band` badge)
  - Amallar (Ko'rish, Biriktirishdan chiqarish)

### 6.2. `GroupStatisticsPage.tsx`
- Replaces the current placeholder card.
- **Summary Metrics (Stat Cards)**:
  - Guruh o'rtacha Band bali
  - Listening o'rtacha Band
  - Reading o'rtacha Band
  - Jami test topshirishlar soni
- **Leaderboard (O'quvchilar reytingi)**:
  - O'quvchilar umumiy o'rtacha Band bo'yicha kamayish tartibida saralangan.
  - Reyting o'rni (1, 2, 3 uchun oltin/kumush/bronza nishonlari).
  - O'quvchi ismi, Username.
  - Topshirgan testlari soni.
  - O'rtacha Band balli.
  - Oxirgi test topshirilgan sana.

### 6.3. `StudentDashboardPage.tsx` & IELTS Pages
- **Recent Submissions Section**: "So'nggi natijalarim" (Test nomi, turi, Band balli, to'g'ri javoblar, sana).
- **Listening & Reading Pages**:
  - Testlar ro'yxatida har bir test yonida topshirilganlik statusi ko'rinadi:
    - Agar topshirilmagan bo'lsa: "Boshlash"
    - Agar topshirilgan bo'lsa: `Band 7.5` yashil nishoni va "Qayta ko'rish" tugmasi.

---

## 7. Internationalization (i18n)

All new strings added to `frontend/src/locales/uz.json` and `en.json`:
- `tasks.assignTask`, `tasks.assignedSuccessfully`, `tasks.unassignedSuccessfully`
- `statistics.groupAverageBand`, `statistics.leaderboard`, `statistics.rank`, `statistics.testsTaken`
- `ielts.submissionSuccess`, `ielts.yourBandScore`, `ielts.submittedStatus`

---

## 8. Error Handling & Edge Cases

1. **Multiple Submissions**: By default, `IeltsSubmission` uses `@@unique([studentId, taskId])`. An upsert operation ensures the student's latest or highest attempt is saved without database conflict errors.
2. **Teacher/Admin Test Preview**: When a teacher or super admin opens an IELTS test to preview, `IeltsTaskViewer` detects `user.role !== 'STUDENT'` and ignores `IELTS_TEST_SUBMITTED`, preventing ghost submissions.
3. **Network Failure on Submit**: If `POST /ielts/:taskId/submit` fails, show error toast with retry button; student's results in the iframe remain visible.

---

## 9. Testing Strategy

1. **Backend Unit & Integration Tests**:
   - `ielts.service.spec.ts`: test `submitTask` logic, score calculation, student isolation.
   - `groups.service.spec.ts`: test group task assignment and statistics calculation.
2. **Frontend Component Tests**:
   - `GroupTasksPage.spec.tsx`: verify task listing, submission count rendering.
   - `GroupStatisticsPage.spec.tsx`: verify metrics cards and leaderboard sorting.
   - `IeltsTaskViewer.spec.tsx`: verify `postMessage` event listener and submit mutation trigger.

---

## 10. Out of Scope (Future Phases)

- Writing task essay text submission and teacher manual grading.
- Speaking task audio recording and voice upload.
- Timed exam mode with countdown timer enforcement.
