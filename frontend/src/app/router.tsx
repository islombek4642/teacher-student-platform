import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/auth/LoginPage';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppLayout } from '@/components/shared/AppLayout';
import { RoleHomeRedirect } from '@/app/RoleHomeRedirect';
import { TeachersPage } from '@/features/super-admin/TeachersPage';
import { GroupsPage } from '@/features/teacher/GroupsPage';
import { GroupLayout } from '@/features/teacher/GroupLayout';
import { GroupStudentsPage } from '@/features/teacher/GroupStudentsPage';
import { GroupTasksPage } from '@/features/teacher/GroupTasksPage';
import { NewTaskPage } from '@/features/teacher/NewTaskPage';
import { GroupStatisticsPage } from '@/features/teacher/GroupStatisticsPage';
import { AssignedTasksPage } from '@/features/student/AssignedTasksPage';
import { TaskSubmissionPage } from '@/features/student/TaskSubmissionPage';
import { StudentProgressPage } from '@/features/student/StudentProgressPage';

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
            <Route path="tasks" element={<GroupTasksPage />} />
            <Route path="tasks/new" element={<NewTaskPage />} />
            <Route path="statistics" element={<GroupStatisticsPage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
        <Route element={<AppLayout />}>
          <Route path="/student/tasks" element={<AssignedTasksPage />} />
          <Route path="/student/tasks/:id" element={<TaskSubmissionPage />} />
          <Route path="/student/progress" element={<StudentProgressPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
