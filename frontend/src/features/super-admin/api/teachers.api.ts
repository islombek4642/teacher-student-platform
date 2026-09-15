import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreatedAccount, Teacher } from '@/api/types';

export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: async () => (await apiClient.get<Teacher[]>('/teachers')).data,
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { username: string; firstName: string; lastName: string }) =>
      (await apiClient.post<CreatedAccount>('/teachers', dto)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });
}
