import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NewTaskPage } from './NewTaskPage';
import { useCreateTask } from './api/tasks.api';

vi.mock('./api/tasks.api');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/teacher/groups/g1/tasks/new']}>
      <Routes>
        <Route path="/teacher/groups/:id/tasks/new" element={<NewTaskPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('NewTaskPage', () => {
  it('renders a per-question validation error and does not submit when the MULTIPLE_CHOICE correct answer is not among its options', async () => {
    const mutate = vi.fn();
    vi.mocked(useCreateTask).mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<
      typeof useCreateTask
    >);

    renderPage();

    await userEvent.type(screen.getByLabelText(/tasks.taskTitle/i), 'Present Simple');

    // Add a question and switch it to MULTIPLE_CHOICE.
    await userEvent.click(screen.getByRole('button', { name: /tasks.addQuestion/i }));
    await userEvent.click(screen.getByRole('combobox'));
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
    vi.mocked(useCreateTask).mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<
      typeof useCreateTask
    >);

    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /tasks.addQuestion/i }));
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'tasks.multipleChoice' }));

    expect(screen.getByPlaceholderText('tasks.options 1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('tasks.options 2')).toBeInTheDocument();

    const firstOptionRow = screen.getByPlaceholderText('tasks.options 1').closest('div')!;
    await userEvent.click(within(firstOptionRow).getByRole('button', { name: 'tasks.delete' }));

    expect(screen.queryByPlaceholderText('tasks.options 2')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('tasks.options 1')).toBeInTheDocument();
  });

  it('submits with the groupId taken from the route, not a form field', async () => {
    const mutate = vi.fn();
    vi.mocked(useCreateTask).mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<
      typeof useCreateTask
    >);

    renderPage();

    expect(screen.queryByText(/tasks.selectGroup/i)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/tasks.taskTitle/i), 'Present Simple');
    await userEvent.click(screen.getByRole('button', { name: /tasks.addQuestion/i }));
    await userEvent.type(screen.getByPlaceholderText('tasks.questionText'), 'He ___ to school.');
    await userEvent.type(screen.getByPlaceholderText('tasks.correctAnswer'), 'goes');
    await userEvent.click(screen.getByRole('button', { name: 'tasks.create' }));

    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ groupId: 'g1' }), expect.anything());
  });
});
