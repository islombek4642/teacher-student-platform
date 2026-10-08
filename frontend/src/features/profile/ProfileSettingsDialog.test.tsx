import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileSettingsDialog } from './ProfileSettingsDialog';
import * as profileApi from './api/profile.api';

describe('ProfileSettingsDialog', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>,
    );
  };

  it('renders profile tab with user info and switches to password tab', async () => {
    vi.spyOn(profileApi, 'useGetMe').mockReturnValue({
      data: {
        id: 'u1',
        username: 'testuser',
        role: 'TEACHER',
        profileId: 'p1',
        firstName: 'John',
        lastName: 'Doe',
      },
      isLoading: false,
    } as any);

    renderWithProviders(<ProfileSettingsDialog open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TEACHER')).toBeInTheDocument();

    const passwordTab = screen.getByRole('tab', { name: /profile.passwordTab|Parol/i });
    await userEvent.click(passwordTab);

    expect(screen.getByLabelText(/^Joriy parol$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Yangi parol$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Yangi parolni tasdiqlang$/i)).toBeInTheDocument();
  });
});
