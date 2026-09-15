import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TasksPage } from './TasksPage';
import { useGroups } from './api/groups.api';
import { useDeleteTask, useTasksForGroup } from './api/tasks.api';

vi.mock('./api/groups.api');
vi.mock('./api/tasks.api');
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('TasksPage', () => {
  it('prompts to select a group when none is selected', () => {
    vi.mocked(useGroups).mockReturnValue({ data: [{ id: 'g1', name: 'Group 1' }] } as unknown as ReturnType<
      typeof useGroups
    >);
    vi.mocked(useTasksForGroup).mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useTasksForGroup
    >);
    vi.mocked(useDeleteTask).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteTask>);

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('tasks.selectGroupPrompt')).toBeInTheDocument();
    expect(screen.queryByText('tasks.empty')).not.toBeInTheDocument();
  });

  it('shows an empty message when the selected group has no tasks', async () => {
    vi.mocked(useGroups).mockReturnValue({ data: [{ id: 'g1', name: 'Group 1' }] } as unknown as ReturnType<
      typeof useGroups
    >);
    vi.mocked(useTasksForGroup).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useTasksForGroup>);
    vi.mocked(useDeleteTask).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteTask>);

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'Group 1' }));

    expect(screen.getByText('tasks.empty')).toBeInTheDocument();
    expect(screen.queryByText('tasks.selectGroupPrompt')).not.toBeInTheDocument();
  });
});
