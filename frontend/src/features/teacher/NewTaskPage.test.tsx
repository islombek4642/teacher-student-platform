import { MemoryRouter } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NewTaskPage } from './NewTaskPage';
import { useGroups } from './api/groups.api';
import { useCreateTask } from './api/tasks.api';

vi.mock('./api/groups.api');
vi.mock('./api/tasks.api');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('NewTaskPage', () => {
  it('renders a per-question validation error and does not submit when the MULTIPLE_CHOICE correct answer is not among its options', async () => {
    const mutate = vi.fn();
    vi.mocked(useGroups).mockReturnValue({
      data: [{ id: 'g1', name: 'Group 1', teacherId: 't1', createdAt: '' }],
    } as unknown as ReturnType<typeof useGroups>);
    vi.mocked(useCreateTask).mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<
      typeof useCreateTask
    >);

    render(
      <MemoryRouter>
        <NewTaskPage />
      </MemoryRouter>,
    );

    // Pick the group.
    await userEvent.click(screen.getByRole('combobox', { name: /tasks.selectGroup/i }));
    await userEvent.click(await screen.findByRole('option', { name: 'Group 1' }));

    await userEvent.type(screen.getByLabelText(/tasks.taskTitle/i), 'Present Simple');

    // Add a question and switch it to MULTIPLE_CHOICE.
    await userEvent.click(screen.getByRole('button', { name: /tasks.addQuestion/i }));
    const questionTypeCombobox = screen.getAllByRole('combobox')[1];
    await userEvent.click(questionTypeCombobox);
    await userEvent.click(await screen.findByRole('option', { name: 'tasks.multipleChoice' }));

    await userEvent.type(screen.getByPlaceholderText('tasks.questionText'), 'Pick one');
    await userEvent.type(screen.getByPlaceholderText('tasks.options 1'), 'A');
    await userEvent.type(screen.getByPlaceholderText('tasks.options 2'), 'B');
    await userEvent.type(screen.getByPlaceholderText('tasks.correctAnswer'), 'Z');

    await userEvent.click(screen.getByRole('button', { name: 'tasks.create' }));

    expect(await screen.findByText('tasks.correctAnswerMustBeOption')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('removes a single option from a MULTIPLE_CHOICE question', async () => {
    vi.mocked(useGroups).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useGroups>);
    vi.mocked(useCreateTask).mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<
      typeof useCreateTask
    >);

    render(
      <MemoryRouter>
        <NewTaskPage />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: /tasks.addQuestion/i }));
    const questionTypeCombobox = screen.getAllByRole('combobox')[1];
    await userEvent.click(questionTypeCombobox);
    await userEvent.click(await screen.findByRole('option', { name: 'tasks.multipleChoice' }));

    expect(screen.getByPlaceholderText('tasks.options 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('tasks.options 2')).toBeInTheDocument();

    const firstOptionRow = screen.getByPlaceholderText('tasks.options 1').closest('div')!;
    await userEvent.click(within(firstOptionRow).getByRole('button', { name: 'tasks.delete' }));

    expect(screen.queryByPlaceholderText('tasks.options 2')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('tasks.options 1')).toBeInTheDocument();
  });
});
