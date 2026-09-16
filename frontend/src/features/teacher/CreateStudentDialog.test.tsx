import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateStudentDialog } from './CreateStudentDialog';
import { useCreateStudent } from './api/students.api';

vi.mock('./api/students.api');
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('CreateStudentDialog', () => {
  it('does not submit when required fields are empty', async () => {
    const mutate = vi.fn();
    vi.mocked(useCreateStudent).mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useCreateStudent>);
    render(<CreateStudentDialog groupId="g1" open onOpenChange={() => {}} onCreated={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: /students.create/i }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it('submits the form with entered values', async () => {
    const mutate = vi.fn();
    vi.mocked(useCreateStudent).mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useCreateStudent>);
    render(<CreateStudentDialog groupId="g1" open onOpenChange={() => {}} onCreated={() => {}} />);

    await userEvent.type(screen.getByLabelText(/students.username/i), 'student.a');
    await userEvent.type(screen.getByLabelText(/students.firstName/i), 'Anvar');
    await userEvent.type(screen.getByLabelText(/students.lastName/i), 'Aliyev');
    await userEvent.click(screen.getByRole('button', { name: /students.create/i }));

    expect(mutate).toHaveBeenCalledWith(
      { username: 'student.a', firstName: 'Anvar', lastName: 'Aliyev' },
      expect.anything(),
    );
  });
});
