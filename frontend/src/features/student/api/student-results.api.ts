import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuth } from '@/auth/useAuth';
import type { IeltsSubmission } from '@/features/ielts/api/ielts.api';

export function useStudentMySubmissions(enabled = true) {
  const { payload } = useAuth();
  const isStudent = payload?.role === 'STUDENT';

  return useQuery({
    queryKey: ['my-submissions'],
    queryFn: async () => {
      const res = await apiClient.get<IeltsSubmission[]>('/ielts/my-submissions');
      return res.data;
    },
    enabled: enabled && isStudent,
  });
}

export function useStudentTaskAttempts(taskId: string, enabled = true) {
  return useQuery({
    queryKey: ['task-attempts', taskId],
    queryFn: async () => {
      const res = await apiClient.get<IeltsSubmission[]>(`/ielts/${taskId}/attempts`);
      return res.data;
    },
    enabled: !!taskId && enabled,
  });
}
