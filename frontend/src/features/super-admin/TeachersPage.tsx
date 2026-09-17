import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PasswordReveal } from '@/components/shared/PasswordReveal';
import { toast } from '@/components/ui/toast';
import { useDeleteTeacher, useResetTeacherPassword, useSetTeacherActive, useTeachers } from './api/teachers.api';
import { CreateTeacherDialog } from './CreateTeacherDialog';

export function TeachersPage() {
  const { t } = useTranslation();
  const { data: teachers, isLoading } = useTeachers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutate: setActive } = useSetTeacherActive();
  const { mutate: resetPassword } = useResetTeacherPassword();
  const { mutate: remove } = useDeleteTeacher();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('teachers.title')}</h1>
        <Button onClick={() => setDialogOpen(true)}>{t('teachers.create')}</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('teachers.username')}</TableHead>
            <TableHead>{t('teachers.firstName')}</TableHead>
            <TableHead>{t('teachers.lastName')}</TableHead>
            <TableHead>{t('teachers.password')}</TableHead>
            <TableHead>{t('teachers.status')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t('teachers.loading')}
              </TableCell>
            </TableRow>
          ) : teachers && teachers.length > 0 ? (
            teachers.map((teacher) => (
              <TableRow key={teacher.id}>
                <TableCell>{teacher.username}</TableCell>
                <TableCell>{teacher.firstName}</TableCell>
                <TableCell>{teacher.lastName}</TableCell>
                <TableCell>
                  {teacher.temporaryPassword ? (
                    <PasswordReveal value={teacher.temporaryPassword} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={teacher.isActive ? 'success' : 'secondary'}>
                    {teacher.isActive ? t('teachers.active') : t('teachers.disabled')}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={() => setActive({ id: teacher.id, isActive: !teacher.isActive })}>
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
                            onSuccess: () => toast.add({ type: 'success', description: t('teachers.resetSuccess') }),
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
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t('teachers.empty')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <CreateTeacherDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
