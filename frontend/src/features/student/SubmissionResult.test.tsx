import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SubmissionResult } from './SubmissionResult';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
  }),
}));

describe('SubmissionResult', () => {
  it('shows the score and marks each answer correct or incorrect', () => {
    render(
      <SubmissionResult
        submission={{
          id: 's1',
          taskId: 't1',
          studentId: 'st1',
          status: 'COMPLETED',
          score: 1,
          submittedAt: '2026-09-15T00:00:00.000Z',
          answers: [
            { id: 'a1', questionId: 'q1', studentAnswer: 'goes', isCorrect: true, questionText: 'She ___ to school.', correctAnswer: 'goes' },
            { id: 'a2', questionId: 'q2', studentAnswer: 'A', isCorrect: false, questionText: 'Pick B.', correctAnswer: 'B' },
          ],
        }}
      />,
    );

    expect(screen.getByText(/studentTasks.score/)).toBeInTheDocument();
    expect(screen.getByText(/studentTasks.correct\)/)).toBeInTheDocument();
    expect(screen.getByText(/studentTasks.incorrect\)/)).toBeInTheDocument();
    expect(screen.getByText('She ___ to school.')).toBeInTheDocument();
    expect(screen.getByText(/studentTasks.correctAnswerIs/)).toBeInTheDocument();
  });
});
