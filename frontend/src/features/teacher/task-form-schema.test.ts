import { describe, expect, it } from 'vitest';
import { taskFormSchema } from './task-form-schema';

const base = { groupId: 'g1', title: 'Present Simple', description: '' };

describe('taskFormSchema', () => {
  it('rejects a task with zero questions', () => {
    const result = taskFormSchema.safeParse({ ...base, questions: [] });
    expect(result.success).toBe(false);
  });

  it('rejects a MULTIPLE_CHOICE question with fewer than 2 options', () => {
    const result = taskFormSchema.safeParse({
      ...base,
      questions: [{ type: 'MULTIPLE_CHOICE', text: 'Pick one', options: ['A'], correctAnswer: 'A' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a MULTIPLE_CHOICE question whose correct answer is not among the options', () => {
    const result = taskFormSchema.safeParse({
      ...base,
      questions: [
        { type: 'MULTIPLE_CHOICE', text: 'Pick one', options: ['A', 'B'], correctAnswer: 'C' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid task with a FILL_BLANK and a MULTIPLE_CHOICE question', () => {
    const result = taskFormSchema.safeParse({
      ...base,
      questions: [
        { type: 'FILL_BLANK', text: 'She ___ to school.', correctAnswer: 'goes' },
        { type: 'MULTIPLE_CHOICE', text: 'Pick one', options: ['A', 'B'], correctAnswer: 'B' },
      ],
    });
    expect(result.success).toBe(true);
  });
});
