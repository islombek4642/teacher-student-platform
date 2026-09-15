import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Group } from '@/api/types';

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await apiClient.get<Group[]>('/groups')).data,
  });
}

export function useGroup(groupId: string) {
  const { data: groups } = useGroups();
  return groups?.find((g) => g.id === groupId);
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => (await apiClient.post<Group>('/groups', { name })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useRenameGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) =>
      (await apiClient.patch<Group>(`/groups/${id}`, { name })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/groups/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}
