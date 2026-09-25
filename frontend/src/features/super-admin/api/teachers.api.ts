import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreatedAccount, Teacher } from '@/api/types';

export function useTeachers() {
  return useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Teacher[]; meta: any }>('/teachers');
      return response.data.data;
    },
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

export function useSetTeacherActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await apiClient.patch<{ id: string; isActive: boolean }>(`/teachers/${id}`, { isActive })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });
}

export function useResetTeacherPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<{ temporaryPassword: string }>(`/teachers/${id}/reset-password`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/teachers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });
}
