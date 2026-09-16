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
function Wrapper({ initialOpen = true, onCreated = () => {} }: { initialOpen?: boolean; onCreated?: (id: string, password: string) => void }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button onClick={() => setOpen(true)}>reopen</button>
      <CreateTeacherDialog open={open} onOpenChange={setOpen} onCreated={onCreated} />
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

    render(<CreateTeacherDialog open onOpenChange={() => {}} onCreated={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /teachers.create/i }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it('submits the form with entered values', async () => {
    const mutate = vi.fn();
    vi.mocked(useCreateTeacher).mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateTeacher>);

    render(<CreateTeacherDialog open onOpenChange={() => {}} onCreated={() => {}} />);
    await userEvent.type(screen.getByLabelText(/teachers.username/i), 'teacher.ali');
    await userEvent.type(screen.getByLabelText(/teachers.firstName/i), 'Ali');
    await userEvent.type(screen.getByLabelText(/teachers.lastName/i), 'Valiyev');
    await userEvent.click(screen.getByRole('button', { name: /teachers.create/i }));

    expect(mutate).toHaveBeenCalledWith(
      { username: 'teacher.ali', firstName: 'Ali', lastName: 'Valiyev' },
      expect.anything(),
    );
  });

  it('reports the created id/password and closes the dialog on success', async () => {
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
    const onCreated = vi.fn();

    render(<Wrapper onCreated={onCreated} />);

    await userEvent.type(screen.getByLabelText(/teachers.username/i), 'teacher.ali');
    await userEvent.type(screen.getByLabelText(/teachers.firstName/i), 'Ali');
    await userEvent.type(screen.getByLabelText(/teachers.lastName/i), 'Valiyev');
    await userEvent.click(screen.getByRole('button', { name: /teachers.create/i }));

    expect(onCreated).toHaveBeenCalledWith('t1', 'temp-pass-123');
    expect(screen.queryByLabelText(/teachers.username/i)).not.toBeInTheDocument();

    // Reopening shows a fresh, empty form rather than a lingering notice.
    await userEvent.click(screen.getByRole('button', { name: 'reopen' }));
    expect(screen.getByLabelText(/teachers.username/i)).toHaveValue('');
  });
});
