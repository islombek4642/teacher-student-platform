import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw-server';
import { useTeachers } from './teachers.api';

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useTeachers', () => {
  it('fetches the teacher list from the API', async () => {
    server.use(
      http.get('http://localhost:3000/teachers', () =>
        HttpResponse.json({
          data: [{ id: 't1', username: 'teacher.a', firstName: 'A', lastName: 'B', isActive: true }],
          meta: { total: 1, page: 1, lastPage: 1 },
        }),
      ),
    );

    const { result } = renderHook(() => useTeachers(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data?.[0].username).toBe('teacher.a');
  });
});
