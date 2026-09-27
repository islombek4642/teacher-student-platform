import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReadingPage } from './ReadingPage';
import { useIeltsTasks, useDeleteIeltsTask } from './api/ielts.api';
import { useAuth } from '@/auth/useAuth';

vi.mock('./api/ielts.api');
vi.mock('@/auth/useAuth');
vi.mock('./UploadIeltsDialog', () => ({
  UploadIeltsDialog: () => null,
}));
vi.mock('./IeltsTaskViewer', () => ({
  IeltsTaskViewer: () => null,
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

describe('ReadingPage', () => {
  it('renders table headers with # numbering column and sequential numbers', () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    const mockTasks = [
      { id: '1', title: 'Reading Passage 1', type: 'READING', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: '2', title: 'Reading Passage 2', type: 'READING', createdAt: '2026-09-02T00:00:00.000Z' },
    ];

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: mockTasks,
      isLoading: false,
    } as any);
    vi.mocked(useDeleteIeltsTask).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(<ReadingPage />);

    // Header should have # column
    expect(screen.getByText('#')).toBeInTheDocument();
    expect(screen.getByText('Reading Passage 1')).toBeInTheDocument();
    expect(screen.getByText('Reading Passage 2')).toBeInTheDocument();

    // Row numbers 1 and 2 should exist
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders pagination and handles page switching with accurate sequential numbering', async () => {
    vi.mocked(useAuth).mockReturnValue({
      payload: { role: 'TEACHER', userId: 't1' },
    } as any);

    const mockTasks = Array.from({ length: 12 }, (_, i) => ({
      id: `task-${i + 1}`,
      title: `Reading Task ${i + 1}`,
      type: 'READING',
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

    render(<ReadingPage />);

    // Total count
    expect(screen.getByText('Jami: 12 ta')).toBeInTheDocument();

    // Page 1
    expect(screen.getByText('Reading Task 1')).toBeInTheDocument();
    expect(screen.getByText('Reading Task 10')).toBeInTheDocument();
    expect(screen.queryByText('Reading Task 11')).not.toBeInTheDocument();

    // Next page
    const user = userEvent.setup();
    const nextBtn = screen.getByText('common.next');
    await user.click(nextBtn);

    // Page 2
    expect(screen.getByText('Reading Task 11')).toBeInTheDocument();
    expect(screen.getByText('Reading Task 12')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
