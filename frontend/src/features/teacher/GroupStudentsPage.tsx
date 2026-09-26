import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PasswordReveal } from '@/components/shared/PasswordReveal';
import { PersonAvatar } from '@/components/shared/PersonAvatar';
import { toast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/PageHeader';
import { downloadBlob } from '@/utils/fileDownload';
import { useImportSingleGroup, exportSingleGroup } from './api/groups.api';
import {
  useDeleteStudent,
  useResetStudentPassword,
  useStudents,
  useUpdateStudent,
} from './api/students.api';
import { CreateStudentDialog } from './CreateStudentDialog';

export function GroupStudentsPage() {
  const { t } = useTranslation();
  const { id: groupId } = useParams<{ id: string }>();
  const { data: students, isLoading } = useStudents(groupId!);
  const { mutate: update } = useUpdateStudent(groupId!);
  const { mutate: resetPassword } = useResetStudentPassword(groupId!);
  const { mutate: remove } = useDeleteStudent(groupId!);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingFirstName, setEditingFirstName] = useState('');
  const [editingLastName, setEditingLastName] = useState('');
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);

  const { mutate: importGroup, isPending: isImporting } = useImportSingleGroup();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveEdit = (studentId: string) => {
    if (!editingFirstName.trim() || !editingLastName.trim()) return;
    update(
      { id: studentId, firstName: editingFirstName, lastName: editingLastName },
      { onSuccess: () => setEditingId(null) },
    );
  };

  const handleExport = async () => {
    if (!groupId) return;
    try {
      const blob = await exportSingleGroup(groupId);
      downloadBlob(blob, 'guruh_oquvchilar.xlsx');
    } catch (err) {
      toast.add({ type: 'error', description: t('common.error') });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId) return;
    importGroup({ id: groupId, file }, {
      onSuccess: (data) => {
        toast.add({ type: 'success', description: `${data.success} ${t('common.imported') || 'imported'}` });
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      onError: () => toast.add({ type: 'error', description: t('common.error') })
    });
  };

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleImport} />
      <PageHeader
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Icon icon="lucide:download" />
              {t('common.export')}
            </Button>
            <Button variant="outline" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
              <Icon icon="lucide:upload" />
              {t('common.import')}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Icon icon="lucide:user-plus" />
              {t('students.create')}
            </Button>
          </div>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>{t('students.username')}</TableHead>
            <TableHead>{t('students.password') || 'Password'}</TableHead>
            <TableHead>{t('students.firstName')}</TableHead>
            <TableHead>{t('students.lastName')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t('students.loading')}
              </TableCell>
            </TableRow>
          ) : students && students.length > 0 ? (
            students.map((student) => (
              <TableRow key={student.id}>
                <TableCell>
                  <PersonAvatar firstName={student.firstName} lastName={student.lastName} />
                </TableCell>
                <TableCell>{student.username}</TableCell>
                <TableCell>
                  {student.temporaryPassword ? (
                    <PasswordReveal value={student.temporaryPassword} />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
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
                <TableCell className="flex justify-end gap-1">
                  {editingId === student.id ? (
                    <Button size="sm" onClick={() => saveEdit(student.id)}>
                      <Icon icon="lucide:check" />
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
                      <Icon icon="lucide:pencil" />
                      {t('students.edit')}
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" aria-label={t('common.moreActions')}>
                          <Icon icon="lucide:more-vertical" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() =>
                          resetPassword(student.id, {
                            onSuccess: (data) => {
                              setResetResult({
                                name: `${student.firstName} ${student.lastName}`,
                                password: data.temporaryPassword,
                              });
                            },
                          })
                        }
                      >
                        <Icon icon="lucide:key-round" />
                        {t('students.resetPassword')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm(t('students.confirmDelete'))) remove(student.id);
                        }}
                      >
                        <Icon icon="lucide:trash-2" />
                        {t('students.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t('students.empty')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <CreateStudentDialog groupId={groupId!} open={dialogOpen} onOpenChange={setDialogOpen} />
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-background p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold">{t('students.resetSuccess')}</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {resetResult.name} {t('students.newPasswordIs')}
            </p>
            <div className="mb-6 flex items-center gap-2 rounded border bg-muted/50 p-3">
              <code className="flex-1 text-center text-xl font-bold tracking-widest">{resetResult.password}</code>
            </div>
            <Button className="w-full" onClick={() => setResetResult(null)}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
