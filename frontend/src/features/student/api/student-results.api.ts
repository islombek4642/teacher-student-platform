import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { IeltsSubmission } from '@/features/ielts/api/ielts.api';

export function useStudentMySubmissions() {
  return useQuery({
    queryKey: ['my-submissions'],
    queryFn: async () => {
      const res = await apiClient.get<IeltsSubmission[]>('/ielts/my-submissions');
      return res.data;
    },
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
