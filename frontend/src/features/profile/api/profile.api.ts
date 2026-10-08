import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface UserProfileResponse {
  id: string;
  username: string;
  role: string;
  profileId: string | null;
  firstName: string | null;
  lastName: string | null;
}

export function useGetMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await apiClient.get<UserProfileResponse>('/auth/me');
      return data;
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) => {
      const { data } = await apiClient.post<{ success: boolean; message: string }>(
        '/auth/change-password',
        payload,
      );
      return data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { firstName: string; lastName: string }) => {
      const { data } = await apiClient.patch<{ success: boolean; firstName: string; lastName: string }>(
        '/auth/profile',
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
