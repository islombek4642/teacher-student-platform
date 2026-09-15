import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Task } from '@/api/types';
import type { TaskFormValues } from '../task-form-schema';

export function useTasksForGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: ['groups', groupId, 'tasks'],
    queryFn: async () => (await apiClient.get<Task[]>(`/groups/${groupId}/tasks`)).data,
    enabled: !!groupId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: TaskFormValues) =>
      (
        await apiClient.post<Task>('/tasks', {
          subjectCode: 'ENGLISH',
          groupId: values.groupId,
          title: values.title,
          description: values.description || null,
          questions: values.questions.map((q) =>
            q.type === 'MULTIPLE_CHOICE'
              ? { type: q.type, text: q.text, options: q.options, correctAnswer: q.correctAnswer }
              : { type: q.type, text: q.text, correctAnswer: q.correctAnswer },
          ),
        })
      ).data,
    onSuccess: (task) => queryClient.invalidateQueries({ queryKey: ['groups', task.groupId, 'tasks'] }),
  });
}

export function useDeleteTask(groupId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'tasks'] }),
  });
}
