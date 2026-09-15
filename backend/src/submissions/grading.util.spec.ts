import { QuestionType } from '@prisma/client';
import { gradeAnswer } from './grading.util';

describe('gradeAnswer', () => {
  it('marks an exact multiple-choice match as correct', () => {
    expect(gradeAnswer({ type: QuestionType.MULTIPLE_CHOICE, correctAnswer: 'B' }, 'B')).toBe(true);
  });

  it('marks a mismatched multiple-choice answer as incorrect', () => {
    expect(gradeAnswer({ type: QuestionType.MULTIPLE_CHOICE, correctAnswer: 'B' }, 'A')).toBe(false);
  });

  it('marks a fill-blank answer correct regardless of case and surrounding whitespace', () => {
    expect(gradeAnswer({ type: QuestionType.FILL_BLANK, correctAnswer: 'goes' }, '  Goes  ')).toBe(true);
  });

  it('marks a fill-blank answer incorrect when the words differ', () => {
    expect(gradeAnswer({ type: QuestionType.FILL_BLANK, correctAnswer: 'goes' }, 'go')).toBe(false);
  });
});
