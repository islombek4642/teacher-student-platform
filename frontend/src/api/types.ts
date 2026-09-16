export type Role = 'SUPER_ADMIN' | 'TEACHER' | 'STUDENT';

export interface Teacher {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  temporaryPassword: string | null;
}

export interface CreatedAccount {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  temporaryPassword: string;
}

export interface Group {
  id: string;
  name: string;
  teacherId: string;
  createdAt: string;
}

export interface Student {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  temporaryPassword: string | null;
}

export type QuestionType = 'MULTIPLE_CHOICE' | 'FILL_BLANK';

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: string[] | null;
  correctAnswer?: string;
}

export interface Task {
  id: string;
  subjectId: string;
  groupId: string;
  teacherId: string;
  title: string;
  description: string | null;
  createdAt: string;
  questions: Question[];
  // Only present on the student-facing "assigned tasks" endpoint.
  mySubmission?: { score: number; submittedAt: string | null } | null;
}

export interface Answer {
  id: string;
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  questionText: string | null;
  correctAnswer: string | null;
}

export interface Submission {
  id: string;
  taskId: string;
  studentId: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  score: number;
  submittedAt: string | null;
  answers: Answer[];
}

export interface GroupOverview {
  studentCount: number;
  averageScore: number;
  tasksCompleted: number;
}

export interface LeaderboardEntry {
  studentId: string;
  firstName: string;
  lastName: string;
  totalScore: number;
}

export interface TaskStats {
  submissionCount: number;
  averageScore: number;
  mostMissedQuestions: { id: string; text: string; missCount: number }[];
}

export interface StudentProgress {
  tasksCompleted: number;
  averageScore: number;
  lastActivityAt: string | null;
}

export interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  message: string;
}
