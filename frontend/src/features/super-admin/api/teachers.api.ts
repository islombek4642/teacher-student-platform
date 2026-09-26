import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreatedAccount, Teacher } from '@/api/types';

export function useTeachers(page: number = 1) {
  return useQuery({
    queryKey: ['teachers', page],
    queryFn: async () => {
      const response = await apiClient.get<{ data: Teacher[]; meta: { total: number; page: number; lastPage: number } }>(`/teachers?page=${page}&limit=10`);
      return response.data;
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
    mutationFn: async ({ id, force }: { id: string; force?: boolean }) => 
      apiClient.delete(`/teachers/${id}${force ? '?force=true' : ''}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });
}

export function useImportTeachers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return (await apiClient.post<{ success: number; results: { username: string; temporaryPassword: string }[] }>('/teachers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teachers'] }),
  });
}

export async function exportTeachers() {
  const response = await apiClient.get('/teachers/export', { responseType: 'blob' });
  return response.data;
}
