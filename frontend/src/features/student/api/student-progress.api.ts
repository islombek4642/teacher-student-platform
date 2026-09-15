import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { StudentProgress } from '@/api/types';

export function useStudentProgress() {
  return useQuery({
    queryKey: ['statistics', 'me'],
    queryFn: async () => (await apiClient.get<StudentProgress>('/statistics/me')).data,
  });
}
