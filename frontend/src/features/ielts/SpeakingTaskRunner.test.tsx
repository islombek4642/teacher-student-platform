import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpeakingTaskRunner, parseSpeakingContent } from './SpeakingTaskRunner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/components/ui/toast', () => ({
  toast: { add: vi.fn() },
}));

vi.mock('./api/ielts.api', () => ({
  useSubmitIeltsTask: () => ({
    mutateAsync: vi.fn(),
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

describe('SpeakingTaskRunner', () => {
  const sampleContent = JSON.stringify({
    part1: {
      topic: 'Hometown and Study',
      questions: ['Where are you from?', 'Do you study or work?'],
    },
    part2: {
      topic: 'Describe a memorable holiday.',
      prompts: ['Where you went', 'Who you went with', 'What you did'],
    },
    part3: {
      topic: 'Tourism and Society',
      questions: ['Why do people like traveling?'],
    },
  });

  it('parses structured JSON speaking content correctly', () => {
    const parsed = parseSpeakingContent(sampleContent);
    expect(parsed.part1?.questions.length).toBe(2);
    expect(parsed.part2?.topic).toBe('Describe a memorable holiday.');
    expect(parsed.part3?.questions.length).toBe(1);
  });

  it('renders Part 1 questions and navigates between Part 1, 2, and 3', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <SpeakingTaskRunner
        taskId="t-speak-1"
        taskTitle="Speaking Practice Test 1"
        contentHtml={sampleContent}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/Speaking Practice Test 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Where are you from\?/i)).toBeInTheDocument();

    // Navigate to Part 2
    const part2NavBtn = screen.getByRole('button', { name: /Part 2/i });
    fireEvent.click(part2NavBtn);
    expect(screen.getByText(/Describe a memorable holiday/i)).toBeInTheDocument();
    expect(screen.getByText(/Where you went/i)).toBeInTheDocument();

    // Navigate to Part 3
    const part3NavBtn = screen.getByRole('button', { name: /Part 3/i });
    fireEvent.click(part3NavBtn);
    expect(screen.getByText(/Why do people like traveling\?/i)).toBeInTheDocument();
  });
});
