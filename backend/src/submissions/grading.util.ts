import { QuestionType } from '@prisma/client';

export function gradeAnswer(
  question: { type: QuestionType; correctAnswer: string },
  studentAnswer: string,
): boolean {
  if (question.type === QuestionType.MULTIPLE_CHOICE) {
    return studentAnswer === question.correctAnswer;
  }
  return studentAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
}
