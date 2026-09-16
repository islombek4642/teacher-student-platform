import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PasswordReveal } from '@/components/shared/PasswordReveal';
import { useGroup } from './api/groups.api';
import {
  useDeleteStudent,
  useResetStudentPassword,
  useStudents,
  useUpdateStudent,
} from './api/students.api';
import { CreateStudentDialog } from './CreateStudentDialog';

export function GroupDetailPage() {
  const { t } = useTranslation();
  const { id: groupId } = useParams<{ id: string }>();
  const group = useGroup(groupId!);
  const { data: students, isLoading } = useStudents(groupId!);
  const { mutate: update } = useUpdateStudent(groupId!);
  const { mutate: resetPassword } = useResetStudentPassword();
  const { mutate: remove } = useDeleteStudent(groupId!);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFirstName, setEditingFirstName] = useState('');
  const [editingLastName, setEditingLastName] = useState('');
  const [resetPasswordValue, setResetPasswordValue] = useState<string | null>(null);

  const saveEdit = (studentId: string) => {
    // Guard against blank names — a lesson from Task 16's GroupsPage rename
    // flow, where submitting an empty value produced an invalid record.
    if (!editingFirstName.trim() || !editingLastName.trim()) return;
    update(
      { id: studentId, firstName: editingFirstName, lastName: editingLastName },
      // Defer exiting edit mode until the mutation actually succeeds, rather
      // than optimistically closing it right after calling update() — see
      // Task 16's review for the bug this avoids (edit UI closing over a
      // failed update, hiding the fact that nothing was saved).
      { onSuccess: () => setEditingId(null) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{group?.name ?? t('students.title')}</h1>
        <Button
          onClick={() => {
            setResetPasswordValue(null);
            setDialogOpen(true);
          }}
        >
          {t('students.create')}
        </Button>
      </div>
      {resetPasswordValue && (
        <div className="flex items-center justify-between gap-2 rounded bg-muted p-2 text-sm">
          <span>{t('students.resetPasswordNotice')}</span>
          <PasswordReveal value={resetPasswordValue} />
          <Button variant="ghost" size="sm" onClick={() => setResetPasswordValue(null)}>
            ×
          </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('students.username')}</TableHead>
            <TableHead>{t('students.firstName')}</TableHead>
            <TableHead>{t('students.lastName')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {t('students.loading')}
              </TableCell>
            </TableRow>
          ) : students && students.length > 0 ? (
            students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>{student.username}</TableCell>
                <TableCell>
                  {editingId === student.id ? (
                    <Input value={editingFirstName} onChange={(e) => setEditingFirstName(e.target.value)} />
                  ) : (
                    student.firstName
                  )}
                </TableCell>
                <TableCell>
                  {editingId === student.id ? (
                    <Input value={editingLastName} onChange={(e) => setEditingLastName(e.target.value)} />
                  ) : (
                    student.lastName
                  )}
                </TableCell>
                <TableCell className="flex gap-2">
                  {editingId === student.id ? (
                    <Button size="sm" onClick={() => saveEdit(student.id)}>
                      {t('students.save')}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResetPasswordValue(null);
                        setEditingId(student.id);
                        setEditingFirstName(student.firstName);
                        setEditingLastName(student.lastName);
                      }}
                    >
                      {t('students.edit')}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      resetPassword(student.id, {
                        onSuccess: (result) => setResetPasswordValue(result.temporaryPassword),
                      })
                    }
                  >
                    {t('students.resetPassword')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(t('students.confirmDelete'))) remove(student.id);
                    }}
                  >
                    {t('students.delete')}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {t('students.empty')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <CreateStudentDialog groupId={groupId!} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
