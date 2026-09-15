import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppLayout } from './AppLayout';
import { useAuth } from '@/auth/useAuth';

vi.mock('@/auth/useAuth');
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  };
});

describe('AppLayout', () => {
  it('displays the username and calls logout when the logout button is clicked', async () => {
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      token: 'tok',
      payload: { sub: 'u1', role: 'TEACHER', profileId: 'p1' },
      username: 'teacher1',
      logout,
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    expect(screen.getByText('teacher1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /nav.logout/i }));

    expect(logout).toHaveBeenCalled();
  });

  it('falls back to payload.sub when username is null', () => {
    vi.mocked(useAuth).mockReturnValue({
      token: 'tok',
      payload: { sub: 'u1', role: 'TEACHER', profileId: 'p1' },
      username: null,
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    expect(screen.getByText('u1')).toBeInTheDocument();
  });

  it('renders the teacher nav links for a TEACHER user', () => {
    vi.mocked(useAuth).mockReturnValue({
      token: 'tok',
      payload: { sub: 'u1', role: 'TEACHER', profileId: 'p1' },
      username: 'teacher1',
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'groups.title' })).toHaveAttribute(
      'href',
      '/teacher/groups',
    );
    expect(screen.getByRole('link', { name: 'tasks.title' })).toHaveAttribute(
      'href',
      '/teacher/tasks',
    );
    expect(screen.getByRole('link', { name: 'statistics.title' })).toHaveAttribute(
      'href',
      '/teacher/statistics',
    );
  });

  it('renders the student nav links for a STUDENT user', () => {
    vi.mocked(useAuth).mockReturnValue({
      token: 'tok',
      payload: { sub: 'u2', role: 'STUDENT', profileId: 'p2' },
      username: 'student1',
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'studentTasks.title' })).toHaveAttribute(
      'href',
      '/student/tasks',
    );
    expect(screen.getByRole('link', { name: 'studentProgress.title' })).toHaveAttribute(
      'href',
      '/student/progress',
    );
  });

  it('renders no nav links for a SUPER_ADMIN user without crashing', () => {
    vi.mocked(useAuth).mockReturnValue({
      token: 'tok',
      payload: { sub: 'u3', role: 'SUPER_ADMIN', profileId: 'p3' },
      username: 'admin1',
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
