export type Role = 'SUPER_ADMIN' | 'TEACHER' | 'STUDENT';

export interface Teacher {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
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
}

export interface Answer {
  id: string;
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
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
  mostMissedQuestionIds: string[];
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
