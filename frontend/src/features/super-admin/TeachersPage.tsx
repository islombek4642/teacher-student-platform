import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PasswordReveal } from '@/components/shared/PasswordReveal';
import { useDeleteTeacher, useSetTeacherActive, useTeachers } from './api/teachers.api';
import { CreateTeacherDialog } from './CreateTeacherDialog';

export function TeachersPage() {
  const { t } = useTranslation();
  const { data: teachers, isLoading } = useTeachers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutate: setActive } = useSetTeacherActive();
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
                  <Badge variant={teacher.isActive ? 'default' : 'secondary'}>
                    {teacher.isActive ? t('teachers.active') : t('teachers.disabled')}
                  </Badge>
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setActive({ id: teacher.id, isActive: !teacher.isActive })}>
                    {teacher.isActive ? t('teachers.disable') : t('teachers.enable')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (window.confirm(t('teachers.confirmDelete'))) remove(teacher.id);
                    }}
                  >
                    {t('teachers.delete')}
                  </Button>
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
