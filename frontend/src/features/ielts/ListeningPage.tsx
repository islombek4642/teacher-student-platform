import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { useTeacherTasks, useDeleteIeltsTask } from './api/ielts.api';
import { UploadIeltsDialog } from './UploadIeltsDialog';
import { IeltsTaskViewer } from './IeltsTaskViewer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ListeningPage() {
  const { t } = useTranslation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const { data: tasks, isLoading } = useTeacherTasks();
  const deleteMutation = useDeleteIeltsTask();
  
  const listeningTasks = tasks?.filter((t) => t.type === 'LISTENING') || [];

  const handleDelete = (id: string) => {
    if (window.confirm(t('common.confirmDelete') || 'Haqiqatan ham o`chirmoqchimisiz?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader 
        title={t('ielts.listening')} 
        action={
          <Button onClick={() => setUploadOpen(true)}>
            <Icon icon="lucide:upload" className="mr-2" />
            {t('ielts.uploadTask')}
          </Button>
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
                <TableCell colSpan={3} className="text-center">{t('common.loading') || 'Loading...'}</TableCell>
              </TableRow>
            ) : listeningTasks.length > 0 ? (
              listeningTasks.map(task => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setViewingTaskId(task.id)}>{t('ielts.view')}</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(task.id)} disabled={deleteMutation.isPending}>
                      <Icon icon="lucide:trash-2" className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  <Icon icon="lucide:headphones" className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  {t('ielts.emptyTasks')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <UploadIeltsDialog 
        open={uploadOpen} 
        onOpenChange={setUploadOpen} 
        type="LISTENING" 
      />
      {viewingTaskId && (
        <IeltsTaskViewer 
          taskId={viewingTaskId} 
          onClose={() => setViewingTaskId(null)} 
        />
      )}
    </div>
  );
}
