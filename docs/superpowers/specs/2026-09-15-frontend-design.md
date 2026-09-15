# Teacher-Student Platform — Frontend Design Spec

Date: 2026-09-15
Status: Approved (ready for implementation planning)

## 1. Purpose

Build the React frontend for the teacher-student task platform described
in `2026-09-15-teacher-student-platform-design.md`. The backend
(NestJS + Prisma, all 12 planned tasks) is complete and pushed to
GitHub. This spec covers the second project stage: a single-page app
serving all three roles (`SUPER_ADMIN`, `TEACHER`, `STUDENT`) against
the existing REST API.

## 2. Scope

**In scope (single MVP phase, all three roles together):**

- Login and role-based routing/navigation.
- SUPER_ADMIN: create, disable/enable, and delete teacher accounts.
- TEACHER: full CRUD on groups; full CRUD on students within a group,
  including password reset; create and delete tasks/questions;
  statistics dashboards (group overview, leaderboard, per-task stats).
- STUDENT: view assigned tasks, submit answers, see personal progress.
- uz/en internationalization via `react-i18next`.
- Unit/component test coverage (Vitest + React Testing Library).

**Out of scope (this phase):**

- Editing task/question content after creation (only delete, and only
  when no submissions exist).
- Any deployment/hosting concerns — local run only, matching the
  backend spec's MVP scope.
- E2E browser tests (Playwright) — may be added in a later phase.

## 3. Backend Gap: New Endpoints Required

The backend design spec describes full CRUD for teachers/groups/students,
but the implemented controllers only expose `POST` (create) and `GET`
(list) for every resource — no update/delete exists yet. This phase
adds the missing endpoints alongside the frontend features that need
them, following the existing NestJS module patterns (DTO + service
method + controller route + `RolesGuard`/ownership check + unit and
integration tests):

| Endpoint | Role | Purpose |
|---|---|---|
| `PATCH /teachers/:id` | SUPER_ADMIN | `{ isActive }` — disable/enable a teacher account |
| `DELETE /teachers/:id` | SUPER_ADMIN | Permanently delete a teacher account |
| `PATCH /groups/:id` | TEACHER (owner) | Rename a group |
| `DELETE /groups/:id` | TEACHER (owner) | Delete a group |
| `PATCH /students/:id` | TEACHER (owner) | Edit a student's first/last name |
| `POST /students/:id/reset-password` | TEACHER (owner) | Generate and return a new one-time password |
| `DELETE /groups/:groupId/students/:id` | TEACHER (owner) | Remove a student |
| `DELETE /tasks/:id` | TEACHER (owner) | Delete a task; rejects with `ERR_TASK_HAS_SUBMISSIONS` if any submission exists |

All new endpoints reuse the existing `ERROR_CODES` constant and
`HttpExceptionFilter` pattern — no new error-handling infrastructure.

## 4. Tech Stack

- **Build tool:** Vite (React + TypeScript template)
- **Styling / components:** Tailwind CSS + shadcn/ui
- **Icons:** Iconify (`@iconify/react`)
- **Routing:** react-router-dom, role-guarded routes
- **Server state:** TanStack Query (all API calls, caching, refetching)
- **Forms:** react-hook-form + zod (schemas mirroring backend DTOs)
- **i18n:** react-i18next — `locales/uz.json`, `locales/en.json`, default `uz`
- **Charts:** Recharts (statistics dashboards)
- **Tests:** Vitest + React Testing Library + msw (API mocking)

## 5. Project Structure

`frontend/` sits at the repo root next to `backend/`:

```
frontend/
  src/
    api/                # TanStack Query hooks + typed API client (Bearer token)
    app/                # App.tsx, router config, providers
    auth/                # login page, AuthContext, ProtectedRoute
    components/ui/       # shadcn components
    components/shared/   # layout, navbar, error boundary, empty states
    features/
      super-admin/        # teacher CRUD
      teacher/             # groups, students, tasks, statistics
      student/             # assigned tasks, submission, progress
    locales/
    lib/                 # utils, error-code -> i18n key mapping
```

## 6. Auth & Routing

**Token handling:** the backend's `JwtStrategy` extracts the token via
`ExtractJwt.fromAuthHeaderAsBearerToken()`, so the frontend stores the
JWT in `localStorage` and attaches it as `Authorization: Bearer <token>`
via an API client interceptor. A 401 response triggers automatic
logout and redirect to `/login`.

**Routes:**

```
/login
/super-admin/teachers
/teacher/groups
/teacher/groups/:id
/teacher/tasks
/teacher/tasks/new
/teacher/tasks/:id
/teacher/statistics
/student/tasks
/student/tasks/:id
/student/progress
```

`ProtectedRoute` redirects to `/login` when there's no token, and to
the caller's own role-home when the route's required role doesn't
match the authenticated user's role. `/` redirects to the role-home.
A shared `AppLayout` (navbar with logo, language switcher, user name,
logout) wraps role-specific side navigation.

## 7. Feature Modules

**SUPER_ADMIN — `/super-admin/teachers`**
- Table of all teachers (name, username, active status) via `GET /teachers`.
- "New teacher" dialog → `POST /teachers`, one-time password shown with a copy button.
- Per row: disable/enable toggle (`PATCH /teachers/:id`), delete with confirmation (`DELETE /teachers/:id`).

**TEACHER — `/teacher/groups`**
- Group list via `GET /groups`; create, rename (`PATCH /groups/:id`), delete (`DELETE /groups/:id`).
- Group detail (`/teacher/groups/:id`): student table via `GET /groups/:id/students`; add student (`POST /groups/:groupId/students`, one-time password shown), edit (`PATCH /students/:id`), reset password (`POST /students/:id/reset-password`), remove (`DELETE /groups/:groupId/students/:id`).

**TEACHER — `/teacher/tasks`**
- Task list filterable by group, via existing `GET /groups/:groupId/tasks`.
- New task: pick subject + group, add questions dynamically (`MULTIPLE_CHOICE` — options + correct-answer radio; `FILL_BLANK` — correct-answer text) → `POST /tasks`.
- Task card: title, question count, link to its statistics, delete (`DELETE /tasks/:id`, disabled/hidden once submissions exist).

**TEACHER — `/teacher/statistics`**
- `GET /groups/:groupId/statistics/overview` — group averages over time (line chart).
- `GET /groups/:groupId/statistics/leaderboard` — ranked table.
- `GET /tasks/:taskId/statistics` — completion count, average score, most-missed questions (bar chart).

**STUDENT — `/student/tasks`**
- `GET /tasks/assigned` returns tasks with their questions inline — no separate detail fetch.
- Opening a task renders the answer form; submit posts to `POST /tasks/:taskId/submit` and immediately shows the score and per-question correctness.

**STUDENT — `/student/progress`**
- `GET /statistics/me` — completed task count, average score, progress over time (line chart).

## 8. Error Handling & i18n

- `lib/error-codes.ts` maps every backend `errorCode` to an
  `errors.<CODE>` key in `locales/{uz,en}.json`; unknown codes fall
  back to `errors.UNKNOWN`.
- TanStack Query's global `onError` shows a toast (shadcn `sonner`) for
  request failures; form-level validation errors render under the
  relevant field via react-hook-form + zod.
- 401 → automatic logout and redirect to `/login`. 403 → "not
  authorized" toast/state. 404 → contextual empty state.
- No UI string is hardcoded — always `t('...')`. Default language
  `uz`; the chosen language persists in `localStorage`.

## 9. Testing Strategy

- Unit/component tests (Vitest + RTL) for: form validation (e.g. empty
  group name, task with zero questions), `ProtectedRoute` redirect
  logic, error-code → i18n mapping, submission-result rendering.
- API hooks tested against `msw`-mocked responses — no dependency on a
  running backend.
- TDD discipline (failing test → implementation), matching the
  backend's existing convention; the `test-driven-development` skill
  is used during implementation.
- The new backend endpoints (§3) get unit + integration tests
  following the existing Jest patterns in each module.

## 10. Out of Scope (this phase)

- Editing question content of an existing task.
- Deployment/hosting.
- Playwright E2E coverage.
- Multiple subjects beyond English (backend already supports this;
  frontend just renders whatever `Subject` rows exist).
