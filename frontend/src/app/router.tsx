import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/auth/LoginPage';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppLayout } from '@/components/shared/AppLayout';
import { RoleHomeRedirect } from '@/app/RoleHomeRedirect';
import { TeachersPage } from '@/features/super-admin/TeachersPage';
import { GroupsPage } from '@/features/teacher/GroupsPage';
import { GroupLayout } from '@/features/teacher/GroupLayout';
import { GroupStudentsPage } from '@/features/teacher/GroupStudentsPage';
import { ListeningPage } from '@/features/ielts/ListeningPage';
import { ReadingPage } from '@/features/ielts/ReadingPage';
import { WritingPage } from '@/features/ielts/WritingPage';
import { SpeakingPage } from '@/features/ielts/SpeakingPage';
export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RoleHomeRedirect />} />

      <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
        <Route element={<AppLayout />}>
          <Route path="/super-admin/teachers" element={<TeachersPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['TEACHER']} />}>
        <Route element={<AppLayout />}>
          <Route path="/teacher/groups" element={<GroupsPage />} />
          <Route path="/teacher/groups/:id" element={<GroupLayout />}>
            <Route index element={<Navigate to="students" replace />} />
            <Route path="students" element={<GroupStudentsPage />} />
          </Route>
          <Route path="/teacher/ielts/listening" element={<ListeningPage />} />
          <Route path="/teacher/ielts/reading" element={<ReadingPage />} />
          <Route path="/teacher/ielts/writing" element={<WritingPage />} />
          <Route path="/teacher/ielts/speaking" element={<SpeakingPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
        <Route element={<AppLayout />}>
          <Route path="/student/ielts/listening" element={<ListeningPage />} />
          <Route path="/student/ielts/reading" element={<ReadingPage />} />
          <Route path="/student/ielts/writing" element={<WritingPage />} />
          <Route path="/student/ielts/speaking" element={<SpeakingPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
