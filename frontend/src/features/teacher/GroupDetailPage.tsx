import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PasswordReveal } from '@/components/shared/PasswordReveal';
import { toast } from '@/components/ui/toast';
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
  const { mutate: resetPassword } = useResetStudentPassword(groupId!);
  const { mutate: remove } = useDeleteStudent(groupId!);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFirstName, setEditingFirstName] = useState('');
  const [editingLastName, setEditingLastName] = useState('');

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
      <Link to="/teacher/groups" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <Icon icon="lucide:arrow-left" className="h-4 w-4" />
        {t('groups.backToList')}
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{group?.name ?? t('students.title')}</h1>
        <Button onClick={() => setDialogOpen(true)}>{t('students.create')}</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('students.username')}</TableHead>
            <TableHead>{t('students.firstName')}</TableHead>
            <TableHead>{t('students.lastName')}</TableHead>
            <TableHead>{t('students.password')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                <TableCell>
                  {student.temporaryPassword ? (
                    <PasswordReveal value={student.temporaryPassword} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
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
                        onSuccess: () => toast.add({ type: 'success', description: t('students.resetSuccess') }),
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
              <TableCell colSpan={5} className="text-center text-muted-foreground">
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
