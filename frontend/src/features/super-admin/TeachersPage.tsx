import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PasswordReveal } from '@/components/shared/PasswordReveal';
import { PersonAvatar } from '@/components/shared/PersonAvatar';
import { PageHeader } from '@/components/shared/PageHeader';
import { toast } from '@/components/ui/toast';
import { downloadBlob } from '@/utils/fileDownload';
import { useDeleteTeacher, useResetTeacherPassword, useSetTeacherActive, useTeachers, useImportTeachers, exportTeachers } from './api/teachers.api';
import { CreateTeacherDialog } from './CreateTeacherDialog';

export function TeachersPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data: response, isLoading } = useTeachers(page);
  const teachers = response?.data;
  const meta = response?.meta;
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutate: setActive } = useSetTeacherActive();
  const { mutate: resetPassword } = useResetTeacherPassword();
  const { mutate: remove } = useDeleteTeacher();
  const { mutate: importTeachers, isPending: isImporting } = useImportTeachers();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      const blob = await exportTeachers();
      downloadBlob(blob, 'oqituvchilar.xlsx');
    } catch (err) {
      toast.add({ type: 'error', description: t('common.error') });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importTeachers(file, {
      onSuccess: (data) => {
        toast.add({ type: 'success', description: `${data.success} ${t('teachers.imported')}` });
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      onError: () => toast.add({ type: 'error', description: t('common.error') })
    });
  };

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleImport} />
      <PageHeader
        title={t('teachers.title')}
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
              {t('teachers.create')}
            </Button>
          </div>
        }
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>{t('teachers.username')}</TableHead>
            <TableHead>{t('teachers.password') || 'Password'}</TableHead>
            <TableHead>{t('teachers.firstName')}</TableHead>
            <TableHead>{t('teachers.lastName')}</TableHead>
            <TableHead>{t('teachers.status')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {t('teachers.loading')}
              </TableCell>
            </TableRow>
          ) : teachers && teachers.length > 0 ? (
            teachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell>
                  <PersonAvatar firstName={teacher.firstName} lastName={teacher.lastName} />
                </TableCell>
                <TableCell>{teacher.username}</TableCell>
                <TableCell>
                  {teacher.temporaryPassword ? (
                    <PasswordReveal value={teacher.temporaryPassword} />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{teacher.firstName}</TableCell>
                <TableCell>{teacher.lastName}</TableCell>
                <TableCell>
                  <Badge variant={teacher.isActive ? 'default' : 'secondary'}>
                    {teacher.isActive ? t('teachers.active') : t('teachers.disabled')}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={() => setActive({ id: teacher.id, isActive: !teacher.isActive })}>
                    <Icon icon={teacher.isActive ? 'lucide:pause' : 'lucide:play'} />
                    {teacher.isActive ? t('teachers.disable') : t('teachers.enable')}
                  </Button>
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
                          resetPassword(teacher.id, {
                            onSuccess: (data) => {
                              toast.add({ type: 'success', description: t('teachers.resetSuccess') + ' ' + t('teachers.newPasswordCopied', { password: data.temporaryPassword }) });
                              navigator.clipboard.writeText(data.temporaryPassword).catch(() => {});
                            }
                          })
                        }
                      >
                        <Icon icon="lucide:key-round" />
                        {t('teachers.resetPassword')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm(t('teachers.confirmDelete'))) remove(teacher.id);
                        }}
                      >
                        <Icon icon="lucide:trash-2" />
                        {t('teachers.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                {t('teachers.empty')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('teachers.totalCount', { count: meta.total })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              {t('common.prev')}
            </Button>
            <Button variant="outline" size="sm" disabled={page === meta.lastPage} onClick={() => setPage(page + 1)}>
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}

      <CreateTeacherDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
