import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export type GroupOverviewStats = {
  groupName: string;
  totalStudents: number;
  totalSubmissions: number;
  averageBand: number;
  maxBand?: number;
  listeningAverageBand: number;
  listeningMaxBand?: number;
  readingAverageBand: number;
  readingMaxBand?: number;
  completionRate: number;
};

export type GroupLeaderboardStudent = {
  studentId: string;
  firstName: string;
  lastName: string;
  username: string;
  testsTaken: number;
  averageBand: number;
  bestBand: number;
  lastActive: string | null;
};

export function useGroupOverviewStats(groupId: string) {
  return useQuery({
    queryKey: ['group-statistics', 'overview', groupId],
    queryFn: async () => {
      const res = await apiClient.get<GroupOverviewStats>(
        `/groups/${groupId}/statistics/overview`,
      );
      return res.data;
    },
    enabled: !!groupId,
  });
}

export function useGroupLeaderboard(groupId: string) {
  return useQuery({
    queryKey: ['group-statistics', 'leaderboard', groupId],
    queryFn: async () => {
      const res = await apiClient.get<GroupLeaderboardStudent[]>(
        `/groups/${groupId}/statistics/leaderboard`,
      );
      return res.data;
    },
    enabled: !!groupId,
  });
}

export async function exportGroupStatistics(groupId: string) {
  const response = await apiClient.get(`/groups/${groupId}/statistics/export`, {
    responseType: 'blob',
  });
  return response.data;
}
