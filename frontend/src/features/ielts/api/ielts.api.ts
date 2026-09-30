import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuth } from '@/auth/useAuth';

export type IeltsTask = {
  id: string;
  title: string;
  type: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
  createdAt: string;
};

export function useIeltsTasks() {
  const { payload } = useAuth();
  const isTeacher = payload?.role === 'TEACHER' || payload?.role === 'SUPER_ADMIN';
  const isStudent = payload?.role === 'STUDENT';

  return useQuery({
    queryKey: ['ielts-tasks', isTeacher ? 'teacher' : 'student'],
    queryFn: async () => {
      const endpoint = isTeacher ? '/ielts/teacher' : '/ielts/student';
      return (await apiClient.get<IeltsTask[]>(endpoint)).data;
    },
    enabled: !!payload?.role && (isTeacher || isStudent),
  });
}

export function useTeacherTasks() {
  return useIeltsTasks();
}

export function useStudentTasks() {
  return useQuery({
    queryKey: ['ielts-tasks', 'student'],
    queryFn: async () => (await apiClient.get<IeltsTask[]>('/ielts/student')).data,
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
export function useDeleteIeltsTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete('/ielts/' + id);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ielts-tasks'] });
    },
  });
}

export type SubmitIeltsTaskPayload = {
  score: number;
  total?: number;
  band: number;
  results: Array<{
    question: string | number;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
};

export type IeltsSubmission = {
  id: string;
  taskId: string;
  score: number;
  total: number;
  band: number;
  attempt?: number;
  submittedAt: string;
  task?: {
    id: string;
    title: string;
    type: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
  };
};

export function useSubmitIeltsTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: SubmitIeltsTaskPayload;
    }) => {
      const res = await apiClient.post<IeltsSubmission>(`/ielts/${taskId}/submit`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ielts-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['task-attempts'] });
      queryClient.invalidateQueries({ queryKey: ['group-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['group-statistics'] });
    },
  });
}
