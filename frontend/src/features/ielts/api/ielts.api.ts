import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuth } from '@/auth/useAuth';

export type IeltsTask = {
  id: string;
  title: string;
  type: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
  createdAt: string;
  contentHtml?: string;
  _count?: {
    groupTasks: number;
    submissions: number;
  };
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

export function useBulkDeleteIeltsTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      const res = await apiClient.post('/ielts/bulk-delete', { taskIds });
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
  answersJson?: Array<{
    question: string | number;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
  }>;
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

export type WritingCriteria = {
  taskResponse: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammaticalAccuracy: number;
};

export type GradeSubmissionPayload = WritingCriteria & {
  band?: number;
  feedback?: string;
};

export type SubmissionToGrade = {
  id: string;
  studentId: string;
  taskId: string;
  score: number;
  total: number;
  band: number;
  attempt: number;
  isGraded: boolean;
  criteriaJson?: WritingCriteria | null;
  feedback?: string | null;
  submittedAt: string;
  answersJson?: any;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    group?: { id: string; name: string };
    user?: { username: string };
  };
  task: {
    id: string;
    title: string;
    type: 'WRITING' | 'SPEAKING';
  };
};

export function useSubmissionsToGrade(taskId?: string) {
  return useQuery({
    queryKey: ['submissions-to-grade', taskId],
    queryFn: async () => {
      const url = taskId ? `/ielts/submissions/to-grade?taskId=${encodeURIComponent(taskId)}` : '/ielts/submissions/to-grade';
      return (await apiClient.get<SubmissionToGrade[]>(url)).data;
    },
  });
}

export function useGradeSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submissionId,
      data,
    }: {
      submissionId: string;
      data: GradeSubmissionPayload;
    }) => {
      return (await apiClient.patch(`/ielts/submissions/${submissionId}/grade`, data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions-to-grade'] });
      queryClient.invalidateQueries({ queryKey: ['group-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
    },
  });
}

export type SpeakingCriteria = {
  fluencyCoherence: number;
  lexicalResource: number;
  grammaticalAccuracy: number;
  pronunciation: number;
};

export type GradeSpeakingPayload = SpeakingCriteria & {
  band?: number;
  feedback?: string;
};

export function useGradeSpeakingSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      submissionId,
      data,
    }: {
      submissionId: string;
      data: GradeSpeakingPayload;
    }) => {
      return (await apiClient.patch(`/ielts/submissions/${submissionId}/grade-speaking`, data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions-to-grade'] });
      queryClient.invalidateQueries({ queryKey: ['group-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
    },
  });
}

export function useCreateSpeakingTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; contentHtml: string; groupId?: string }) => {
      return (await apiClient.post('/ielts/speaking/create', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ielts-tasks'] });
    },
  });
}

