import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTeachers } from './api/teachers.api';
import { CreateTeacherDialog } from './CreateTeacherDialog';

export function TeachersPage() {
  const { t } = useTranslation();
  const { data: teachers } = useTeachers();
  const [dialogOpen, setDialogOpen] = useState(false);

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
            <TableHead>{t('teachers.status')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teachers?.map((teacher) => (
            <TableRow key={teacher.id}>
              <TableCell>{teacher.username}</TableCell>
              <TableCell>{teacher.firstName}</TableCell>
              <TableCell>{teacher.lastName}</TableCell>
              <TableCell>
                <Badge variant={teacher.isActive ? 'default' : 'secondary'}>
                  {teacher.isActive ? t('teachers.active') : t('teachers.disabled')}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CreateTeacherDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
