import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { useLogin } from './useLogin';

vi.mock('./useLogin');
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('LoginPage', () => {
  it('shows a validation error when submitted empty', async () => {
    vi.mocked(useLogin).mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useLogin>);
    render(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: /auth.login.submit/i }));

    const errors = await screen.findAllByText(/required/i);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('calls the login mutation with the entered credentials', async () => {
    const mutate = vi.fn();
    vi.mocked(useLogin).mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useLogin>);
    render(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/auth.login.username/i), 'teacher1');
    await userEvent.type(screen.getByLabelText(/auth.login.password/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /auth.login.submit/i }));

    expect(mutate).toHaveBeenCalledWith({ username: 'teacher1', password: 'secret' });
  });
});
