import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { GroupDetailPage } from './GroupDetailPage';
import { useGroup } from './api/groups.api';
import { useDeleteStudent, useResetStudentPassword, useStudents, useUpdateStudent } from './api/students.api';

vi.mock('./api/groups.api');
vi.mock('./api/students.api');
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
// Isolate GroupDetailPage from CreateStudentDialog's own implementation/hooks.
vi.mock('./CreateStudentDialog', () => ({ CreateStudentDialog: () => null }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/teacher/groups/g1']}>
      <Routes>
        <Route path="/teacher/groups/:id" element={<GroupDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const student = { id: 's1', username: 'student.a', firstName: 'Anvar', lastName: 'Aliyev' };

describe('GroupDetailPage', () => {
  it('renders the loading state', () => {
    vi.mocked(useGroup).mockReturnValue(undefined);
    vi.mocked(useStudents).mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<
      typeof useStudents
    >);
    vi.mocked(useUpdateStudent).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useUpdateStudent>);
    vi.mocked(useResetStudentPassword).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<
      typeof useResetStudentPassword
    >);
    vi.mocked(useDeleteStudent).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteStudent>);

    renderPage();

    expect(screen.getByText('students.loading')).toBeInTheDocument();
  });

  it('renders the empty state', () => {
    vi.mocked(useGroup).mockReturnValue(undefined);
    vi.mocked(useStudents).mockReturnValue({ data: [], isLoading: false } as unknown as ReturnType<typeof useStudents>);
    vi.mocked(useUpdateStudent).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useUpdateStudent>);
    vi.mocked(useResetStudentPassword).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<
      typeof useResetStudentPassword
    >);
    vi.mocked(useDeleteStudent).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteStudent>);

    renderPage();

    expect(screen.getByText('students.empty')).toBeInTheDocument();
  });

  it('does not call the update mutation when saving a blank name', async () => {
    const mutate = vi.fn();
    vi.mocked(useGroup).mockReturnValue(undefined);
    vi.mocked(useStudents).mockReturnValue({ data: [student], isLoading: false } as unknown as ReturnType<
      typeof useStudents
    >);
    vi.mocked(useUpdateStudent).mockReturnValue({ mutate } as unknown as ReturnType<typeof useUpdateStudent>);
    vi.mocked(useResetStudentPassword).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<
      typeof useResetStudentPassword
    >);
    vi.mocked(useDeleteStudent).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteStudent>);

    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'students.edit' }));
    const [firstNameInput] = screen.getAllByRole('textbox');
    await userEvent.clear(firstNameInput);
    await userEvent.click(screen.getByRole('button', { name: 'students.save' }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it('keeps edit mode open until the update mutation succeeds', async () => {
    // mutate deliberately never invokes its onSuccess callback, simulating an
    // in-flight / not-yet-resolved mutation.
    const mutate = vi.fn();
    vi.mocked(useGroup).mockReturnValue(undefined);
    vi.mocked(useStudents).mockReturnValue({ data: [student], isLoading: false } as unknown as ReturnType<
      typeof useStudents
    >);
    vi.mocked(useUpdateStudent).mockReturnValue({ mutate } as unknown as ReturnType<typeof useUpdateStudent>);
    vi.mocked(useResetStudentPassword).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<
      typeof useResetStudentPassword
    >);
    vi.mocked(useDeleteStudent).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<typeof useDeleteStudent>);

    renderPage();

    await userEvent.click(screen.getByRole('button', { name: 'students.edit' }));
    await userEvent.click(screen.getByRole('button', { name: 'students.save' }));

    expect(mutate).toHaveBeenCalled();
    // Still in edit mode: the row still renders inputs and a Save button,
    // not the Edit button, because onSuccess never fired.
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'students.save' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'students.edit' })).not.toBeInTheDocument();
  });
});
