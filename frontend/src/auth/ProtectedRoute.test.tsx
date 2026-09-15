import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from './useAuth';

vi.mock('./useAuth');

function renderWithRoute(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/student/tasks" element={<div>student home</div>} />
        <Route element={<ProtectedRoute allowedRoles={['TEACHER']} />}>
          <Route path="/teacher/groups" element={<div>teacher groups</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when there is no token', () => {
    vi.mocked(useAuth).mockReturnValue({ token: null, payload: null } as unknown as ReturnType<typeof useAuth>);
    renderWithRoute('/teacher/groups');

    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('redirects to the role home when the role does not match', () => {
    vi.mocked(useAuth).mockReturnValue({
      token: 'tok',
      payload: { sub: 'u1', role: 'STUDENT', profileId: 'p1' },
    } as unknown as ReturnType<typeof useAuth>);
    renderWithRoute('/teacher/groups');

    expect(screen.getByText('student home')).toBeInTheDocument();
  });

  it('renders the nested route when the role matches', () => {
    vi.mocked(useAuth).mockReturnValue({
      token: 'tok',
      payload: { sub: 'u1', role: 'TEACHER', profileId: 'p1' },
    } as unknown as ReturnType<typeof useAuth>);
    renderWithRoute('/teacher/groups');

    expect(screen.getByText('teacher groups')).toBeInTheDocument();
  });
});
