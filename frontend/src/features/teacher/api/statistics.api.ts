import { useQueries, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { GroupOverview, LeaderboardEntry, TaskStats } from '@/api/types';

export function useGroupOverview(groupId: string | undefined) {
  return useQuery({
    queryKey: ['groups', groupId, 'statistics', 'overview'],
    queryFn: async () => (await apiClient.get<GroupOverview>(`/groups/${groupId}/statistics/overview`)).data,
    enabled: !!groupId,
  });
}

export function useLeaderboard(groupId: string | undefined) {
  return useQuery({
    queryKey: ['groups', groupId, 'statistics', 'leaderboard'],
    queryFn: async () => (await apiClient.get<LeaderboardEntry[]>(`/groups/${groupId}/statistics/leaderboard`)).data,
    enabled: !!groupId,
  });
}

export function useTaskStats(taskId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', taskId, 'statistics'],
    queryFn: async () => (await apiClient.get<TaskStats>(`/tasks/${taskId}/statistics`)).data,
    enabled: !!taskId,
  });
}

export function useTasksStats(taskIds: string[]) {
  return useQueries({
    queries: taskIds.map((taskId) => ({
      queryKey: ['tasks', taskId, 'statistics'],
      queryFn: async () => (await apiClient.get<TaskStats>(`/tasks/${taskId}/statistics`)).data,
    })),
  });
}
