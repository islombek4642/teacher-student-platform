import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WritingGradingDialog, computeIeltsBand } from './WritingGradingDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/components/ui/toast', () => ({
  toast: {
    add: vi.fn(),
  },
}));

const mockMutateAsync = vi.fn();
vi.mock('./api/ielts.api', () => ({
  useGradeSubmission: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('WritingGradingDialog', () => {
  const mockSubmission = {
    id: 'sub-123',
    studentId: 'stud-1',
    taskId: 'task-w1',
    score: 0,
    total: 40,
    band: 0,
    attempt: 1,
    isGraded: false,
    criteriaJson: null,
    feedback: null,
    submittedAt: '2026-10-08T10:00:00Z',
    answersJson: [
      { question: 'Task 1', userAnswer: 'This is my task 1 chart analysis.', isCorrect: false },
      { question: 'Task 2', userAnswer: 'In conclusion, technology brings advantages and disadvantages.', isCorrect: false },
    ],
    student: {
      id: 'stud-1',
      firstName: 'Ali',
      lastName: 'Valiyev',
      group: { id: 'grp-1', name: 'IELTS Group A' },
      user: { username: 'ali123' },
    },
    task: {
      id: 'task-w1',
      title: 'Writing Academic Test 1',
      type: 'WRITING' as const,
    },
  };

  it('computes accurate IELTS band rounding according to Cambridge/IDP standards', () => {
    expect(computeIeltsBand(6.0, 6.0, 6.0, 6.0)).toBe(6.0);
    // 6.25 -> 6.5
    expect(computeIeltsBand(6.5, 6.5, 6.0, 6.0)).toBe(6.5);
    // 6.75 -> 7.0
    expect(computeIeltsBand(6.5, 7.0, 6.5, 7.0)).toBe(7.0);
    // 6.125 -> 6.0
    expect(computeIeltsBand(6.0, 6.5, 6.0, 6.0)).toBe(6.0);
    // 6.375 -> 6.5
    expect(computeIeltsBand(6.0, 6.5, 6.5, 6.5)).toBe(6.5);
  });

  it('renders student info, essays and allows submitting grades', async () => {
    const onOpenChange = vi.fn();
    mockMutateAsync.mockResolvedValueOnce({ id: 'sub-123', band: 6.5 });

    renderWithProviders(
      <WritingGradingDialog
        submission={mockSubmission}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByText(/Ali Valiyev/i)).toBeInTheDocument();
    expect(screen.getByText(/Writing Academic Test 1/i)).toBeInTheDocument();
    expect(screen.getByText(/This is my task 1 chart analysis/i)).toBeInTheDocument();

    // Switch to Task 2 tab
    const task2TabBtn = screen.getByRole('button', { name: /Task 2/i });
    fireEvent.click(task2TabBtn);
    expect(screen.getByText(/In conclusion, technology brings advantages/i)).toBeInTheDocument();

    // Select TR to 7.0
    const trSelect = screen.getByLabelText(/Task Response/i);
    fireEvent.change(trSelect, { target: { value: '7' } });

    // Fill feedback
    const feedbackInput = screen.getByPlaceholderText(/kuchli tomonlari va tuzatilishi kerak/i);
    fireEvent.change(feedbackInput, { target: { value: 'Well developed essay.' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Bahoni saqlash/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          submissionId: 'sub-123',
          data: expect.objectContaining({
            taskResponse: 7.0,
            feedback: 'Well developed essay.',
          }),
        })
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
