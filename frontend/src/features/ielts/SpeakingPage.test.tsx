import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SpeakingPage } from './SpeakingPage';
import { useIeltsTasks, useBulkDeleteIeltsTasks, useSubmissionsToGrade } from './api/ielts.api';
import { useAuth } from '@/auth/useAuth';

vi.mock('./api/ielts.api');
vi.mock('@/auth/useAuth');
vi.mock('./CreateSpeakingTaskDialog', () => ({
  CreateSpeakingTaskDialog: () => <div data-testid="create-speaking-dialog" />,
}));
vi.mock('./SpeakingTaskRunner', () => ({
  SpeakingTaskRunner: () => <div data-testid="speaking-task-runner" />,
}));
vi.mock('./SpeakingGradingDialog', () => ({
  SpeakingGradingDialog: () => <div data-testid="speaking-grading-dialog" />,
}));
vi.mock('@/features/student/api/student-results.api', () => ({
  useStudentMySubmissions: vi.fn(() => ({ data: [] })),
}));
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, opts?: any) => {
        if (key === 'common.totalCount' && opts?.count !== undefined) {
          return `Jami: ${opts.count} ta`;
        }
        return opts?.defaultValue || key;
      },
    }),
  };
});

describe('SpeakingPage', () => {
  beforeEach(() => {
    vi.mocked(useBulkDeleteIeltsTasks).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    vi.mocked(useSubmissionsToGrade).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
  });

  it('renders table headers with # numbering column and sequential numbers for teacher', () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    const mockTasks = [
      { id: '1', title: 'Speaking Task 1', type: 'SPEAKING', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: '2', title: 'Speaking Task 2', type: 'SPEAKING', createdAt: '2026-09-02T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    render(<SpeakingPage />);

    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Speaking Task 1')).toBeInTheDocument();
    expect(screen.getByText('Speaking Task 2')).toBeInTheDocument();

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders pagination and handles page switching', async () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    const mockTasks = Array.from({ length: 12 }, (_, i) => ({
      id: `task-${i + 1}`,
      title: `Speaking Task ${i + 1}`,
      type: 'SPEAKING',
      createdAt: '2026-09-01T00:00:00.000Z',
    }));

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    render(<SpeakingPage />);

    expect(screen.getByText('Speaking Task 1')).toBeInTheDocument();
    expect(screen.getByText('Speaking Task 10')).toBeInTheDocument();
    expect(screen.queryByText('Speaking Task 11')).not.toBeInTheDocument();

    const user = userEvent.setup();
    const nextBtn = screen.getByRole('button', { name: /common\.next/i });
    await user.click(nextBtn);

    expect(screen.queryByText('Speaking Task 1')).not.toBeInTheDocument();
    expect(screen.getByText('Speaking Task 11')).toBeInTheDocument();
    expect(screen.getByText('Speaking Task 12')).toBeInTheDocument();
  });

  it('allows teacher to switch to reviews tab and see submissions needing grading', async () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    const mockSubmissions = [
      {
        id: 'sub-1',
        taskId: 'task-1',
        studentId: 'stud-1',
        student: { id: 'stud-1', firstName: 'John', lastName: 'Doe' },
        task: { id: 'task-1', title: 'Speaking Test 1', type: 'SPEAKING' },
        submittedAt: '2026-09-01T12:00:00.000Z',
        band: 0,
        isGraded: false,
        answers: {},
      },
    ];

    vi.mocked(useSubmissionsToGrade).mockReturnValue({
      data: mockSubmissions,
      isLoading: false,
    } as any);

    render(<SpeakingPage />);

    // Switch tab to reviews
    const user = userEvent.setup();
    const tabs = screen.getAllByRole('tab');
    await user.click(tabs[1]);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Speaking Test 1')).toBeInTheDocument();
  });

  it('renders student view with take test button', () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'STUDENT', userId: 's1' },
    } as any);

    const mockTasks = [
      { id: '1', title: 'Speaking Task 1', type: 'SPEAKING', createdAt: '2026-09-01T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    render(<SpeakingPage />);

    expect(screen.getByText('Speaking Task 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Boshlash/i })).toBeInTheDocument();
  });
});
