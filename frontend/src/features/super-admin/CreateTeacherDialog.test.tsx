import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateTeacherDialog } from './CreateTeacherDialog';
import { useCreateTeacher } from './api/teachers.api';

vi.mock('./api/teachers.api');
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

// Stateful wrapper so we can drive `open` the way TeachersPage really does:
// closing the dialog (X button) must flow back through `onOpenChange` into
// real state, and reopening must re-render with that updated `open` value.
function Wrapper({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button onClick={() => setOpen(true)}>reopen</button>
      <CreateTeacherDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

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

  it('clears the one-time password notice when the dialog is closed and reopened', async () => {
    const mutate = vi.fn((_data, options) => {
      options.onSuccess({
        id: 't1',
        username: 'teacher.ali',
        firstName: 'Ali',
        lastName: 'Valiyev',
        temporaryPassword: 'temp-pass-123',
      });
    });
    vi.mocked(useCreateTeacher).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateTeacher>);

    render(<Wrapper />);

    await userEvent.type(screen.getByLabelText(/teachers.username/i), 'teacher.ali');
    await userEvent.type(screen.getByLabelText(/teachers.firstName/i), 'Ali');
    await userEvent.type(screen.getByLabelText(/teachers.lastName/i), 'Valiyev');
    await userEvent.click(screen.getByRole('button', { name: /teachers.create/i }));

    expect(await screen.findByText(/teachers.createdPasswordNotice/i)).toBeInTheDocument();

    // Close the dialog (the X / DialogClose button) and reopen it.
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    await userEvent.click(screen.getByRole('button', { name: 'reopen' }));

    expect(screen.queryByText(/teachers.createdPasswordNotice/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/teachers.username/i)).toBeInTheDocument();
  });
});
