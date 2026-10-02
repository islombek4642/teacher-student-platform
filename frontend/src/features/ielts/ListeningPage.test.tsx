import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ListeningPage } from './ListeningPage';
import { useIeltsTasks, useDeleteIeltsTask, useBulkDeleteIeltsTasks } from './api/ielts.api';
import { useAuth } from '@/auth/useAuth';

import { useStudentMySubmissions } from '@/features/student/api/student-results.api';

vi.mock('./api/ielts.api');
vi.mock('@/auth/useAuth');
vi.mock('./UploadIeltsDialog', () => ({
  UploadIeltsDialog: () => null,
}));
const mockIeltsTaskViewer = vi.fn();
vi.mock('./IeltsTaskViewer', () => ({
  IeltsTaskViewer: (props: any) => {
    mockIeltsTaskViewer(props);
    return <div data-testid="ielts-task-viewer" data-mode={props.mode} />;
  },
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

describe('ListeningPage', () => {
  beforeEach(() => {
    vi.mocked(useBulkDeleteIeltsTasks).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });
  it('renders table headers with # numbering column and sequential numbers', () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    const mockTasks = [
      { id: '1', title: 'Task 1', type: 'LISTENING', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: '2', title: 'Task 2', type: 'LISTENING', createdAt: '2026-09-02T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);
    vi.mocked(useDeleteIeltsTask).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(<ListeningPage />);

    // Header should have # column
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();

    // Row numbers 1 and 2 should exist
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders pagination and handles page switching with accurate sequential numbering', async () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    // Create 12 tasks to force 2 pages
    const mockTasks = Array.from({ length: 12 }, (_, i) => ({
      id: `task-${i + 1}`,
      title: `Listening Task ${i + 1}`,
      type: 'LISTENING',
      createdAt: '2026-09-01T00:00:00.000Z',
    }));

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);
    vi.mocked(useDeleteIeltsTask).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(<ListeningPage />);

    // Total count format matching other pages
    expect(screen.getByText('Jami: 12 ta')).toBeInTheDocument();

    // Page 1 should show task 1 to 10
    expect(screen.getByText('Listening Task 1')).toBeInTheDocument();
    expect(screen.getByText('Listening Task 10')).toBeInTheDocument();
    expect(screen.queryByText('Listening Task 11')).not.toBeInTheDocument();

    // Go to next page
    const user = userEvent.setup();
    const nextBtn = screen.getByText('common.next');
    await user.click(nextBtn);

    // Page 2 should show task 11 and 12 with numbers 11 and 12
    expect(screen.getByText('Listening Task 11')).toBeInTheDocument();
    expect(screen.getByText('Listening Task 12')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('displays the latest/best band score badge and does not get stuck at 0 when older attempt was 0', () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'STUDENT', userId: 's1' },
    } as any);

    const mockTasks = [
      { id: 'task-1', title: 'Listening Task 1', type: 'LISTENING', createdAt: '2026-09-01T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    // Backend returns submissions ordered by submittedAt: 'desc'
    // Latest attempt is first (band 6.5), older attempt is second (band 0)
    vi.mocked(useStudentMySubmissions).mockReturnValue({
      data: [
        {
          id: 'sub-2',
          taskId: 'task-1',
          score: 28,
          total: 40,
          band: 6.5,
          attempt: 2,
          submittedAt: '2026-09-30T10:30:00.000Z',
        },
        {
          id: 'sub-1',
          taskId: 'task-1',
          score: 0,
          total: 40,
          band: 0,
          attempt: 1,
          submittedAt: '2026-09-30T10:00:00.000Z',
        },
      ],
    } as any);

    render(<ListeningPage />);

    expect(screen.getByText('Band 6.5')).toBeInTheDocument();
    expect(screen.queryByText('Band 0')).not.toBeInTheDocument();
  });

  it('opens in take mode when a teacher clicks view', async () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    const mockTasks = [
      { id: 'task-100', title: 'Teacher Listening Task', type: 'LISTENING', createdAt: '2026-09-01T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    const user = userEvent.setup();
    render(<ListeningPage />);

    const viewBtn = screen.getByText('ielts.view');
    await user.click(viewBtn);

    expect(mockIeltsTaskViewer).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-100',
        mode: 'take',
      })
    );
  });

  it('opens in review mode when a student has a submission and clicks view', async () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'STUDENT', userId: 's1' },
    } as any);

    const mockTasks = [
      { id: 'task-200', title: 'Student Listening Task', type: 'LISTENING', createdAt: '2026-09-01T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    vi.mocked(useStudentMySubmissions).mockReturnValue({
      data: [
        {
          id: 'sub-200',
          taskId: 'task-200',
          score: 30,
          total: 40,
          band: 7.0,
          attempt: 1,
          submittedAt: '2026-09-30T10:00:00.000Z',
        },
      ],
    } as any);

    const user = userEvent.setup();
    render(<ListeningPage />);

    const viewBtn = screen.getByText('ielts.view');
    await user.click(viewBtn);

    expect(mockIeltsTaskViewer).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-200',
        mode: 'review',
      })
    );
  });
});

