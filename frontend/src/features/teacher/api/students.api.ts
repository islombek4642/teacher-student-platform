import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreatedAccount, Student } from '@/api/types';

export function useStudents(groupId: string, page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: ['groups', groupId, 'students', page, limit],
    queryFn: async () => (await apiClient.get<{ data: Student[]; meta: { total: number; page: number; lastPage: number } }>(`/groups/${groupId}/students?page=${page}&limit=${limit}`)).data,
  });
}

export function useCreateStudent(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: { username: string; firstName: string; lastName: string }) =>
      (await apiClient.post<CreatedAccount>(`/groups/${groupId}/students`, dto)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'students'] }),
  });
}

export function useUpdateStudent(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, firstName, lastName }: { id: string; firstName: string; lastName: string }) =>
      (await apiClient.patch<{ id: string; firstName: string; lastName: string }>(`/students/${id}`, { firstName, lastName }))
        .data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'students'] }),
  });
}

export function useResetStudentPassword(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<{ temporaryPassword: string }>(`/students/${id}/reset-password`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'students'] }),
  });
}

export function useDeleteStudent(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/groups/${groupId}/students/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'students'] }),
  });
}
