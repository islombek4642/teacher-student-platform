import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { useIeltsTasks, useDeleteIeltsTask } from './api/ielts.api';
import { UploadIeltsDialog } from './UploadIeltsDialog';
import { IeltsTaskViewer } from './IeltsTaskViewer';
import { useAuth } from '@/auth/useAuth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ReadingPage() {
  const { t } = useTranslation();
  const { payload } = useAuth();
  const isTeacher = payload?.role === 'TEACHER' || payload?.role === 'SUPER_ADMIN';

  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const { data: tasks, isLoading } = useIeltsTasks();
  const deleteMutation = useDeleteIeltsTask();
  
  const readingTasks = tasks?.filter((t) => t.type === 'READING') || [];

  const handleDelete = (id: string) => {
    if (window.confirm(t('ielts.confirmDelete'))) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader 
        title={t('ielts.reading')} 
        action={
          isTeacher ? (
            <Button onClick={() => setUploadOpen(true)}>
              <Icon icon="lucide:upload" className="mr-2" />
              {t('ielts.uploadTask')}
            </Button>
          ) : undefined
        }
      />
      
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('ielts.name')}</TableHead>
              <TableHead>{t('ielts.date')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">{t('common.loading')}</TableCell>
              </TableRow>
            ) : readingTasks.length > 0 ? (
              readingTasks.map(task => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setViewingTaskId(task.id)}>{t('ielts.view')}</Button>
                    {isTeacher && (
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(task.id)} disabled={deleteMutation.isPending}>
                        <Icon icon="lucide:trash-2" className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  <Icon icon="lucide:book-open" className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  {t('ielts.emptyTasks')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {isTeacher && (
        <UploadIeltsDialog 
          open={uploadOpen} 
          onOpenChange={setUploadOpen} 
          type="READING" 
        />
      )}
      {viewingTaskId && (
        <IeltsTaskViewer 
          taskId={viewingTaskId} 
          onClose={() => setViewingTaskId(null)} 
        />
      )}
    </div>
  );
}
