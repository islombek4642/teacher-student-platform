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



export interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  message: string;
}
