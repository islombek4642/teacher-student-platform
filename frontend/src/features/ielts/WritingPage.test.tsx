import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WritingPage } from './WritingPage';
import { useIeltsTasks, useBulkDeleteIeltsTasks, useSubmissionsToGrade } from './api/ielts.api';
import { useAuth } from '@/auth/useAuth';
import { useStudentMySubmissions } from '@/features/student/api/student-results.api';

vi.mock('./api/ielts.api');
vi.mock('@/auth/useAuth');
vi.mock('./UploadIeltsDialog', () => ({
  UploadIeltsDialog: () => <div data-testid="upload-dialog" />,
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

describe('WritingPage', () => {
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

  it('renders table headers with # numbering column and sequential numbers', () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    const mockTasks = [
      { id: '1', title: 'Writing Task 1', type: 'WRITING', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: '2', title: 'Writing Task 2', type: 'WRITING', createdAt: '2026-09-02T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    render(<WritingPage />);

    // Header should have # column
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Writing Task 1')).toBeInTheDocument();
    expect(screen.getByText('Writing Task 2')).toBeInTheDocument();

    // Sequential row numbers
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders pagination and handles page switching with accurate sequential numbering', async () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    const mockTasks = Array.from({ length: 12 }, (_, i) => ({
      id: `task-${i + 1}`,
      title: `Writing Task ${i + 1}`,
      type: 'WRITING',
      createdAt: '2026-09-01T00:00:00.000Z',
    }));

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    render(<WritingPage />);

    expect(screen.getByText('Writing Task 1')).toBeInTheDocument();
    expect(screen.getByText('Writing Task 10')).toBeInTheDocument();
    expect(screen.queryByText('Writing Task 11')).not.toBeInTheDocument();

    const user = userEvent.setup();
    const nextButton = screen.getByRole('button', { name: /common\.next/i });
    await user.click(nextButton);

    expect(screen.queryByText('Writing Task 1')).not.toBeInTheDocument();
    expect(screen.getByText('Writing Task 11')).toBeInTheDocument();
    expect(screen.getByText('Writing Task 12')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('allows teacher to select tasks and shows bulk selection banner', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    const mockTasks = [
      { id: 'task-1', title: 'Writing Task 1', type: 'WRITING', createdAt: '2026-09-01T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    render(<WritingPage />);

    const rowCheckboxes = document.querySelectorAll('tbody tr td div[class*="rounded border"]');
    expect(rowCheckboxes.length).toBeGreaterThan(0);
    await user.click(rowCheckboxes[0]);

    expect(screen.getByText(/1 ta topshiriq tanlandi/i)).toBeInTheDocument();
  });

  it('renders student view with Boshlash button when unattempted and opens viewer', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'STUDENT', userId: 's1' },
    } as any);

    const mockTasks = [
      { id: 'task-1', title: 'Writing Task 1', type: 'WRITING', createdAt: '2026-09-01T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    render(<WritingPage />);

    const startButton = screen.getByRole('button', { name: /Boshlash/i });
    expect(startButton).toBeInTheDocument();

    await user.click(startButton);
    expect(screen.getByTestId('ielts-task-viewer')).toBeInTheDocument();
    expect(mockIeltsTaskViewer).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-1',
        mode: 'take',
      }),
    );
  });

  it('renders student view with Topshirildi badge and Korish button when attempted', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'STUDENT', userId: 's1' },
    } as any);

    const mockTasks = [
      { id: 'task-1', title: 'Writing Task 1', type: 'WRITING', createdAt: '2026-09-01T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);

    vi.mocked(useStudentMySubmissions).mockReturnValue({
      data: [
        {
          id: 'sub-1',
          taskId: 'task-1',
          band: 0,
          submittedAt: '2026-09-02T00:00:00.000Z',
          attempt: 1,
        } as any,
      ],
    } as any);

    render(<WritingPage />);

    expect(screen.getByText(/Topshirildi/i)).toBeInTheDocument();
    const viewButton = screen.getByRole('button', { name: /ielts\.view/i });
    expect(viewButton).toBeInTheDocument();

    await user.click(viewButton);
    expect(screen.getByTestId('ielts-task-viewer')).toBeInTheDocument();
    expect(mockIeltsTaskViewer).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-1',
        mode: 'review',
        submissionId: 'sub-1',
      }),
    );
  });
});
