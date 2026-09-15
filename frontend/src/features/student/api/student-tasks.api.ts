import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Submission, Task } from '@/api/types';

export function useAssignedTasks() {
  return useQuery({
    queryKey: ['tasks', 'assigned'],
    queryFn: async () => (await apiClient.get<Task[]>('/tasks/assigned')).data,
  });
}

export function useSubmitTask(taskId: string) {
  return useMutation({
    mutationFn: async (answers: { questionId: string; answer: string }[]) =>
      (await apiClient.post<Submission>(`/tasks/${taskId}/submit`, { answers })).data,
  });
}
