import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TaskSubmissionPage } from './TaskSubmissionPage';
import { useAssignedTasks, useSubmitTask } from './api/student-tasks.api';

vi.mock('./api/student-tasks.api');
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const task = {
  id: 't1',
  subjectId: 'sub1',
  groupId: 'g1',
  teacherId: 'te1',
  title: 'Present Simple',
  description: null,
  createdAt: '2026-09-15T00:00:00.000Z',
  questions: [
    { id: 'q1', type: 'FILL_BLANK' as const, text: 'He ___ to school.', options: null },
    { id: 'q2', type: 'MULTIPLE_CHOICE' as const, text: 'Pick one', options: ['A', 'B'] },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/student/tasks/t1']}>
      <Routes>
        <Route path="/student/tasks/:id" element={<TaskSubmissionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('TaskSubmissionPage', () => {
  it('renders a plain text input for FILL_BLANK and a select for MULTIPLE_CHOICE', () => {
    vi.mocked(useAssignedTasks).mockReturnValue({ data: [task] } as unknown as ReturnType<typeof useAssignedTasks>);
    vi.mocked(useSubmitTask).mockReturnValue({ mutate: vi.fn(), data: undefined, isPending: false } as unknown as ReturnType<
      typeof useSubmitTask
    >);

    renderPage();

    // FILL_BLANK still renders as a plain textbox.
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    // MULTIPLE_CHOICE renders as a select combobox, not a textbox.
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows the MULTIPLE_CHOICE options as selectable choices, not free text', async () => {
    vi.mocked(useAssignedTasks).mockReturnValue({ data: [task] } as unknown as ReturnType<typeof useAssignedTasks>);
    vi.mocked(useSubmitTask).mockReturnValue({ mutate: vi.fn(), data: undefined, isPending: false } as unknown as ReturnType<
      typeof useSubmitTask
    >);

    renderPage();

    await userEvent.click(screen.getByRole('combobox'));

    expect(await screen.findByRole('option', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'B' })).toBeInTheDocument();
  });

  it('submits an answer for every question, including unanswered ones', async () => {
    const mutate = vi.fn();
    vi.mocked(useAssignedTasks).mockReturnValue({ data: [task] } as unknown as ReturnType<typeof useAssignedTasks>);
    vi.mocked(useSubmitTask).mockReturnValue({ mutate, data: undefined, isPending: false } as unknown as ReturnType<
      typeof useSubmitTask
    >);

    renderPage();

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'goes');
    // MULTIPLE_CHOICE question deliberately left unanswered.
    await userEvent.click(screen.getByRole('button', { name: 'studentTasks.submit' }));

    expect(mutate).toHaveBeenCalledWith([
      { questionId: 'q1', answer: 'goes' },
      { questionId: 'q2', answer: '' },
    ]);
  });

  it('includes the option selected via the MULTIPLE_CHOICE dropdown in the submit payload', async () => {
    const mutate = vi.fn();
    vi.mocked(useAssignedTasks).mockReturnValue({ data: [task] } as unknown as ReturnType<typeof useAssignedTasks>);
    vi.mocked(useSubmitTask).mockReturnValue({ mutate, data: undefined, isPending: false } as unknown as ReturnType<
      typeof useSubmitTask
    >);

    renderPage();

    await userEvent.type(screen.getByRole('textbox'), 'goes');

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'B' }));

    await userEvent.click(screen.getByRole('button', { name: 'studentTasks.submit' }));

    expect(mutate).toHaveBeenCalledWith([
      { questionId: 'q1', answer: 'goes' },
      { questionId: 'q2', answer: 'B' },
    ]);
  });

  it('replaces the form with the result after a successful submit', () => {
    const submission = {
      id: 's1',
      taskId: 't1',
      studentId: 'st1',
      status: 'COMPLETED' as const,
      score: 1,
      submittedAt: '2026-09-15T00:00:00.000Z',
      answers: [
        { id: 'a1', questionId: 'q1', studentAnswer: 'goes', isCorrect: true },
        { id: 'a2', questionId: 'q2', studentAnswer: '', isCorrect: false },
      ],
    };
    vi.mocked(useAssignedTasks).mockReturnValue({ data: [task] } as unknown as ReturnType<typeof useAssignedTasks>);
    vi.mocked(useSubmitTask).mockReturnValue({
      mutate: vi.fn(),
      data: submission,
      isPending: false,
    } as unknown as ReturnType<typeof useSubmitTask>);

    renderPage();

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'studentTasks.submit' })).not.toBeInTheDocument();
    expect(screen.getByText('studentTasks.correct')).toBeInTheDocument();
    expect(screen.getByText('studentTasks.incorrect')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'studentTasks.backToList' })).toBeInTheDocument();
  });
});
