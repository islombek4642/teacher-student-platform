import { render, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IeltsTaskViewer } from './IeltsTaskViewer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockMutate = vi.fn();
vi.mock('./api/ielts.api', () => ({
  useSubmitIeltsTask: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    payload: { sub: 's1', role: 'STUDENT', profileId: 'sp1' },
    isAuthenticated: true,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => opts?.defaultValue || key,
  }),
}));

describe('IeltsTaskViewer submission listener', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  it('triggers submit mutation when receiving IELTS_TEST_SUBMITTED message for student', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <IeltsTaskViewer taskId="task-123" onClose={() => {}} />
      </QueryClientProvider>
    );

    const testPayload = {
      score: 35,
      total: 40,
      band: 8.0,
      results: [{ question: 1, userAnswer: 'B', correctAnswer: 'B', isCorrect: true }],
    };

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'IELTS_TEST_SUBMITTED',
            payload: testPayload,
          },
        })
      );
    });

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-123',
          data: testPayload,
        }),
        expect.anything()
      );
    });
  });

  it('immediately calls onClose when receiving CLOSE_IELTS_TASK in review mode', async () => {
    const handleClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <IeltsTaskViewer taskId="task-123" mode="review" onClose={handleClose} />
      </QueryClientProvider>
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'CLOSE_IELTS_TASK' },
        })
      );
    });

    await waitFor(() => {
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('immediately calls onClose when receiving CLOSE_IELTS_TASK after submitting in take mode (e.g. retake)', async () => {
    const handleClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <IeltsTaskViewer taskId="task-123" mode="take" onClose={handleClose} />
      </QueryClientProvider>
    );

    // 1. Submit test
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'IELTS_TEST_SUBMITTED',
            payload: { score: 30, total: 40, band: 7.0, results: [] },
          },
        })
      );
    });

    // 2. Click Exit
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'CLOSE_IELTS_TASK' },
        })
      );
    });

    await waitFor(() => {
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
