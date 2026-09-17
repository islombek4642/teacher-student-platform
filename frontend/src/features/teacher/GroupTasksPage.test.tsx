import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GroupTasksPage } from './GroupTasksPage';
import { useDeleteTask, useTasksForGroup } from './api/tasks.api';

vi.mock('./api/tasks.api');
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/teacher/groups/g1/tasks']}>
      <Routes>
        <Route path="/teacher/groups/:id/tasks" element={<GroupTasksPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GroupTasksPage', () => {
  it('shows an empty message when the group has no tasks', () => {
    vi.mocked(useTasksForGroup).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<
      typeof useTasksForGroup
    >);
    vi.mocked(useDeleteTask).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteTask>);

    renderPage();

    expect(screen.getByText('tasks.empty')).toBeInTheDocument();
  });

  it('links "new task" to the current group', async () => {
    vi.mocked(useTasksForGroup).mockReturnValue({
      data: [{ id: 'task1', title: 'Present Simple', questions: [{ id: 'q1' }] }],
      isLoading: false,
    } as unknown as ReturnType<typeof useTasksForGroup>);
    vi.mocked(useDeleteTask).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteTask>);

    renderPage();

    expect(screen.getByRole('link', { name: 'tasks.create' })).toHaveAttribute(
      'href',
      '/teacher/groups/g1/tasks/new',
    );
  });

  it('opens the task view dialog with its questions', async () => {
    vi.mocked(useTasksForGroup).mockReturnValue({
      data: [
        {
          id: 'task1',
          title: 'Present Simple',
          description: null,
          questions: [
            { id: 'q1', type: 'MULTIPLE_CHOICE', text: 'She ___ to school.', options: ['go', 'goes'], correctAnswer: 'goes' },
          ],
        },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useTasksForGroup>);
    vi.mocked(useDeleteTask).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteTask>);

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'tasks.view' }));

    expect(await screen.findByText(/She ___ to school\./)).toBeInTheDocument();
  });

  it('deletes a task after confirmation', async () => {
    const remove = vi.fn();
    vi.mocked(useTasksForGroup).mockReturnValue({
      data: [{ id: 'task1', title: 'Present Simple', questions: [] }],
      isLoading: false,
    } as unknown as ReturnType<typeof useTasksForGroup>);
    vi.mocked(useDeleteTask).mockReturnValue({ mutate: remove } as unknown as ReturnType<typeof useDeleteTask>);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'tasks.delete' }));

    expect(remove).toHaveBeenCalledWith('task1');
  });
});
