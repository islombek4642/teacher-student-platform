import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/card';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { useIeltsTasks, useDeleteIeltsTask } from './api/ielts.api';
import { UploadIeltsDialog } from './UploadIeltsDialog';
import { IeltsTaskViewer } from './IeltsTaskViewer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuth } from '@/auth/useAuth';
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
  const { payload } = useAuth();
  const isTeacher = payload?.role === 'TEACHER' || payload?.role === 'SUPER_ADMIN';

  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const { data: tasks, isLoading } = useIeltsTasks();
  const deleteMutation = useDeleteIeltsTask();
  
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const listeningTasks = tasks?.filter((t) => t.type === 'LISTENING') || [];
  const totalTasks = listeningTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalTasks / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedTasks = listeningTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      deleteMutation.mutate(taskToDelete, {
        onSuccess: () => setTaskToDelete(null),
      });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader 
        title={t('ielts.listening')} 
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
            ) : paginatedTasks.length > 0 ? (
              paginatedTasks.map(task => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setViewingTaskId(task.id)}>{t('ielts.view')}</Button>
                    {isTeacher && (
                      <Button variant="destructive" size="sm" onClick={() => setTaskToDelete(task.id)} disabled={deleteMutation.isPending}>
                        <Icon icon="lucide:trash-2" className="h-4 w-4" />
                      </Button>
                    )}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {t('common.totalCount', { count: totalTasks, defaultValue: `Jami: ${totalTasks} ta` })} ({safePage} / {totalPages})
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t('common.prev')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}

      {isTeacher && (
        <UploadIeltsDialog 
          open={uploadOpen} 
          onOpenChange={setUploadOpen} 
          type="LISTENING" 
        />
      )}
      {viewingTaskId && (
        <IeltsTaskViewer 
          taskId={viewingTaskId} 
          onClose={() => setViewingTaskId(null)} 
        />
      )}

      <ConfirmDialog
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title={t('common.confirmDelete')}
        description={t('ielts.confirmDelete')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
