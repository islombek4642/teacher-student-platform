# Excel Import/Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement robust Excel-based import/export features for Teachers (SuperAdmin) and Groups/Students (Teachers).

**Architecture:** We will use `xlsx` on the backend (NestJS) for processing Excel files securely, generating passwords for imported users using bcrypt, and generating formatted Excel templates for exports. The frontend (React + Vite) will handle file uploads using `multipart/form-data` and trigger file downloads for exports.

**Tech Stack:** NestJS, Prisma, React, TanStack Query, `xlsx` library, `multer`.

**Spec:** The user requests three main capabilities:
1. SuperAdmin: Import/Export Teachers (Columns: Ism, Familiya, Login). Passwords auto-generated on backend.
2. Teacher (Global): Import/Export Groups + Students (Each Group in its own Sheet. Columns: Ism, Familiya, Login). Passwords auto-generated.
3. Teacher (Inside Group): Import/Export Students for a specific group (First row holds group name, Columns: Ism, Familiya, Login). Passwords auto-generated.

## Global Constraints

- Never export passwords.
- Newly imported users should have an auto-generated secure password (we will use `123456` as the standard temporary password unless specified).
- Do not lose existing data when importing (handle username collisions gracefully, e.g., by skipping or throwing clear errors).

## Review Focus

- User uploads a malformed Excel file (e.g., missing sheets or empty headers) -> Should return 400 Bad Request.
- User uploads a file with duplicate usernames already in the database -> Should fail gracefully.
- Parsing multiple sheets correctly assigns students to their respective groups.
- User uploads non-Excel files -> Handled by file validation.
- User (Teacher) tries to import students into a group they don't own -> 403 Forbidden.

---

### Task 1: Backend Setup & Utils

**Files:**
- Create: `backend/src/common/utils/excel.util.ts`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: `npm install xlsx` inside backend.
- Produces: `parseExcel(buffer: Buffer)`, `generateExcel(sheets: Record<string, any[]>)` utility functions.

- [ ] **Step 1: Write the failing test** (or set up dependency)
```bash
cd backend && npm install xlsx
```

- [ ] **Step 2: Write minimal implementation**
```typescript
import * as xlsx from 'xlsx';

export function parseExcelToJSON(buffer: Buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const result: Record<string, any[]> = {};
  for (const sheetName of workbook.SheetNames) {
    result[sheetName] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  }
  return result;
}

export function generateExcelBuffer(sheetsData: Record<string, any[]>) {
  const workbook = xlsx.utils.book_new();
  for (const [sheetName, data] of Object.entries(sheetsData)) {
    const worksheet = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
  }
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
```

- [ ] **Step 3: Commit**
```bash
git add backend/package.json backend/package-lock.json backend/src/common/utils/excel.util.ts
git commit -m "feat(backend): add xlsx utility functions"
```

---

### Task 2: SuperAdmin Teacher Import/Export API

**Files:**
- Modify: `backend/src/users/users.service.ts`
- Modify: `backend/src/users/users.controller.ts`

**Interfaces:**
- Consumes: `parseExcelToJSON`, `generateExcelBuffer`
- Produces: `POST /users/import-teachers`, `GET /users/export-teachers`

- [ ] **Step 1: Write implementation for `users.service.ts`**
Add methods `importTeachers(fileBuffer: Buffer)` and `exportTeachers()`.
`importTeachers` loops through data, hashes "123456", creates users with `Role.TEACHER` and their `teacherProfile`.
`exportTeachers` retrieves all teachers, maps to `{ Ism: string, Familiya: string, Login: string }`, returns a Buffer.

- [ ] **Step 2: Write implementation for `users.controller.ts`**
Add `POST /import-teachers` with `UseInterceptors(FileInterceptor('file'))`.
Add `GET /export-teachers` with `Res()` returning `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.

- [ ] **Step 3: Commit**
```bash
git add backend/src/users
git commit -m "feat(backend): teacher import export api for superadmin"
```

---

### Task 3: Teacher Groups Import/Export API

**Files:**
- Modify: `backend/src/groups/groups.service.ts`
- Modify: `backend/src/groups/groups.controller.ts`

**Interfaces:**
- Consumes: `parseExcelToJSON`, `generateExcelBuffer`
- Produces: `POST /groups/import-groups`, `GET /groups/export-groups`

- [ ] **Step 1: Write implementation for `groups.service.ts`**
`importGroups(fileBuffer, teacherId)`: Reads sheets. Each sheet name is a group name. Creates group if doesn't exist for teacher. Creates students inside and links them.
`exportGroups(teacherId)`: Fetches all groups for teacher. Creates a dictionary mapping group names to their students' array.

- [ ] **Step 2: Write implementation for `groups.controller.ts`**
Expose the endpoints to teachers.

- [ ] **Step 3: Commit**
```bash
git add backend/src/groups
git commit -m "feat(backend): groups import export api for teacher"
```

---

### Task 4: Teacher Single Group Import/Export API

**Files:**
- Modify: `backend/src/groups/groups.service.ts`
- Modify: `backend/src/groups/groups.controller.ts`

**Interfaces:**
- Produces: `POST /groups/:id/import-students`, `GET /groups/:id/export-students`

- [ ] **Step 1: Write implementation for single group APIs**
Similar to Task 3, but the target group ID is known. Validates teacher owns the group.

- [ ] **Step 2: Commit**
```bash
git commit -am "feat(backend): single group import export api"
```

---

### Task 5: Frontend API Integration

**Files:**
- Modify: `frontend/src/features/users/api/users.api.ts`
- Modify: `frontend/src/features/groups/api/groups.api.ts`
- Create: `frontend/src/utils/fileDownload.ts`

- [ ] **Step 1: Add mutation and query hooks for the endpoints**
- [ ] **Step 2: Utility for downloading Blobs as files**
- [ ] **Step 3: Commit**
```bash
git add frontend/src
git commit -m "feat(frontend): api hooks for excel import export"
```

---

### Task 6: Frontend UI Components

**Files:**
- Modify: `frontend/src/features/users/TeachersList.tsx` (or whatever the admin page is called)
- Modify: `frontend/src/features/groups/GroupsList.tsx`
- Modify: `frontend/src/features/groups/GroupDetails.tsx`

- [ ] **Step 1: Add "Import" and "Export" buttons to Teachers List**
- [ ] **Step 2: Add buttons to Groups List**
- [ ] **Step 3: Add buttons to Group Details**
- [ ] **Step 4: Commit**
```bash
git commit -am "feat(frontend): import export ui buttons"
```
