import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateTeacherDialog } from './CreateTeacherDialog';
import { useCreateTeacher } from './api/teachers.api';

vi.mock('./api/teachers.api');
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('CreateTeacherDialog', () => {
  it('does not submit when required fields are empty', async () => {
    const mutate = vi.fn();
    vi.mocked(useCreateTeacher).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateTeacher>);

    render(<CreateTeacherDialog open onOpenChange={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /teachers.create/i }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it('submits the form with entered values', async () => {
    const mutate = vi.fn();
    vi.mocked(useCreateTeacher).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateTeacher>);

    render(<CreateTeacherDialog open onOpenChange={() => {}} />);
    await userEvent.type(screen.getByLabelText(/teachers.username/i), 'teacher.ali');
    await userEvent.type(screen.getByLabelText(/teachers.firstName/i), 'Ali');
    await userEvent.type(screen.getByLabelText(/teachers.lastName/i), 'Valiyev');
    await userEvent.click(screen.getByRole('button', { name: /teachers.create/i }));

    expect(mutate).toHaveBeenCalledWith(
      { username: 'teacher.ali', firstName: 'Ali', lastName: 'Valiyev' },
      expect.anything(),
    );
  });
});
