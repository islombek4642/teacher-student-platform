import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { CreatedAccount, Student } from '@/api/types';

export function useStudents(groupId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'students'],
    queryFn: async () => (await apiClient.get<Student[]>(`/groups/${groupId}/students`)).data,
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

export function useResetStudentPassword() {
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.post<{ temporaryPassword: string }>(`/students/${id}/reset-password`)).data,
  });
}

export function useDeleteStudent(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/groups/${groupId}/students/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'students'] }),
  });
}
