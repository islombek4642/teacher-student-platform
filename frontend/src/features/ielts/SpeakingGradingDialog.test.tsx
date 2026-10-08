import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpeakingGradingDialog } from './SpeakingGradingDialog';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/components/ui/toast', () => ({
  toast: { add: vi.fn() },
}));

const mockMutateAsync = vi.fn();
vi.mock('./api/ielts.api', () => ({
  useGradeSpeakingSubmission: () => ({
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

describe('SpeakingGradingDialog', () => {
  const mockSubmission = {
    id: 'sub-sp-1',
    studentId: 'st-1',
    taskId: 't-s1',
    score: 0,
    total: 40,
    band: 0,
    attempt: 1,
    isGraded: false,
    criteriaJson: null,
    feedback: null,
    submittedAt: '2026-10-08T12:00:00Z',
    answersJson: [
      { question: 'Part 1', userAnswer: '/ielts/speaking/audio/part1.webm', isCorrect: false },
      { question: 'Part 2', userAnswer: '/ielts/speaking/audio/part2.webm', isCorrect: false },
      { question: 'Part 3', userAnswer: '/ielts/speaking/audio/part3.webm', isCorrect: false },
    ],
    student: {
      id: 'st-1',
      firstName: 'Bekzod',
      lastName: 'Karimov',
      group: { id: 'g1', name: 'Speaking Master' },
      user: { username: 'bekzod' },
    },
    task: {
      id: 't-s1',
      title: 'Speaking Test 1: Holidays',
      type: 'SPEAKING' as const,
    },
  };

  it('renders student info, audio players and permits submitting 4 speaking criteria grades', async () => {
    const onOpenChange = vi.fn();
    mockMutateAsync.mockResolvedValueOnce({ id: 'sub-sp-1', band: 7.0 });

    renderWithProviders(
      <SpeakingGradingDialog
        submission={mockSubmission}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByText(/Bekzod Karimov/i)).toBeInTheDocument();
    expect(screen.getByText(/Speaking Test 1: Holidays/i)).toBeInTheDocument();
    expect(screen.getByText(/Part 1: Introduction/i)).toBeInTheDocument();
    expect(screen.getByText(/Part 2: Long Turn/i)).toBeInTheDocument();
    expect(screen.getByText(/Part 3: Discussion/i)).toBeInTheDocument();

    // Select FC to 7.5
    const fcSelect = screen.getByLabelText(/Fluency and Coherence/i);
    fireEvent.change(fcSelect, { target: { value: '7.5' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Bahoni saqlash/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          submissionId: 'sub-sp-1',
          data: expect.objectContaining({
            fluencyCoherence: 7.5,
          }),
        })
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
