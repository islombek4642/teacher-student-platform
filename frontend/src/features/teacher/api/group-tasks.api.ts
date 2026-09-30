import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export type GroupTaskItem = {
  id: string;
  title: string;
  type: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
  isAssigned: boolean;
  studentCount: number;
  submissionCount: number;
  averageBand: number;
  createdAt: string;
};

export function useGroupTasks(groupId: string) {
  return useQuery({
    queryKey: ['group-tasks', groupId],
    queryFn: async () => {
      const res = await apiClient.get<GroupTaskItem[]>(`/groups/${groupId}/tasks`);
      return res.data;
    },
    enabled: !!groupId,
  });
}

export function useAssignGroupTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      taskId,
      assign,
    }: {
      groupId: string;
      taskId: string;
      assign: boolean;
    }) => {
      const res = await apiClient.post(`/groups/${groupId}/tasks/${taskId}/assign`, {
        assign,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-tasks', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-statistics', variables.groupId] });
    },
  });
}

export function useAssignMultipleGroupTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      taskIds,
      assign,
    }: {
      groupId: string;
      taskIds: string[];
      assign: boolean;
    }) => {
      const res = await apiClient.post(`/groups/${groupId}/tasks/assign-multiple`, {
        taskIds,
        assign,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-tasks', variables.groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-statistics', variables.groupId] });
    },
  });
}
