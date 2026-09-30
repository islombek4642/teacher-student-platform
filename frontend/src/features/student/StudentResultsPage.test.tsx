import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StudentResultsPage } from './StudentResultsPage';
import { useStudentMySubmissions } from './api/student-results.api';

vi.mock('./api/student-results.api');
vi.mock('@/features/ielts/IeltsTaskViewer', () => ({
  IeltsTaskViewer: () => null,
}));
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key }),
  };
});

describe('StudentResultsPage', () => {
  const mockSubmissions = [
    {
      id: 'sub-1',
      taskId: 'task-1',
      score: 30,
      total: 40,
      band: 7,
      submittedAt: '2026-09-20T10:00:00.000Z',
      task: { id: 'task-1', title: 'Listening Cam 18 Test 1', type: 'LISTENING' as const },
    },
    {
      id: 'sub-2',
      taskId: 'task-2',
      score: 35,
      total: 40,
      band: 8,
      submittedAt: '2026-09-22T10:00:00.000Z',
      task: { id: 'task-2', title: 'Reading Passage 1', type: 'READING' as const },
    },
  ];

  it('renders KPI summary cards and lists all submissions by default', () => {
    vi.mocked(useStudentMySubmissions).mockReturnValue({
      data: mockSubmissions,
      isLoading: false,
    } as any);

    render(<StudentResultsPage />);

    expect(screen.getByText('Listening Cam 18 Test 1')).toBeInTheDocument();
    expect(screen.getByText('Reading Passage 1')).toBeInTheDocument();
    // Average band: (7 + 8) / 2 = 7.5
    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText('studentResults.totalCompleted')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });

  it('filters submissions when category tab is clicked', async () => {
    vi.mocked(useStudentMySubmissions).mockReturnValue({
      data: mockSubmissions,
      isLoading: false,
    } as any);

    render(<StudentResultsPage />);
    const user = userEvent.setup();

    // Click Reading filter tab
    const readingFilterBtn = screen.getByRole('button', { name: /studentResults.filterReading/i });
    await user.click(readingFilterBtn);

    expect(screen.getByText('Reading Passage 1')).toBeInTheDocument();
    expect(screen.queryByText('Listening Cam 18 Test 1')).not.toBeInTheDocument();
  });
});
