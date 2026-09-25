import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export type IeltsTask = {
  id: string;
  title: string;
  type: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
  createdAt: string;
};

export function useTeacherTasks() {
  return useQuery({
    queryKey: ['ielts-tasks', 'teacher'],
    queryFn: async () => (await apiClient.get<IeltsTask[]>('/ielts/teacher')).data,
  });
}

export function useGroupTasks(groupId: string) {
  return useQuery({
    queryKey: ['ielts-tasks', 'group', groupId],
    queryFn: async () => (await apiClient.get<IeltsTask[]>(`/ielts/group/${groupId}`)).data,
  });
}

export function useUploadIeltsTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      type,
      file,
    }: {
      title: string;
      type: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('type', type);
      formData.append('file', file);
      
      const res = await apiClient.post('/ielts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ielts-tasks'] });
    },
  });
}
