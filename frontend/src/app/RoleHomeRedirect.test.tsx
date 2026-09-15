import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RoleHomeRedirect } from './RoleHomeRedirect';
import { useAuth } from '@/auth/useAuth';

vi.mock('@/auth/useAuth');

function renderAt(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<RoleHomeRedirect />} />
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/teacher/groups" element={<div>teacher groups</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RoleHomeRedirect', () => {
  it('redirects to /login when there is no payload', () => {
    vi.mocked(useAuth).mockReturnValue({ token: null, payload: null } as unknown as ReturnType<typeof useAuth>);
    renderAt('/');

    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('redirects to the role home when a payload is present', () => {
    vi.mocked(useAuth).mockReturnValue({
      token: 'tok',
      payload: { sub: 'u1', role: 'TEACHER', profileId: 'p1' },
    } as unknown as ReturnType<typeof useAuth>);
    renderAt('/');

    expect(screen.getByText('teacher groups')).toBeInTheDocument();
  });
});
