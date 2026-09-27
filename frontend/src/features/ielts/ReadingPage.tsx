import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { useIeltsTasks, useDeleteIeltsTask } from './api/ielts.api';
import { UploadIeltsDialog } from './UploadIeltsDialog';
import { IeltsTaskViewer } from './IeltsTaskViewer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/auth/useAuth';
import { usePaginationKeyboard } from '@/hooks/usePaginationKeyboard';
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
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const { data: tasks, isLoading } = useIeltsTasks();
  const deleteMutation = useDeleteIeltsTask();
  
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const readingTasks = tasks?.filter((t) => t.type === 'READING') || [];
  const totalTasks = readingTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalTasks / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedTasks = readingTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  usePaginationKeyboard({
    page: safePage,
    totalPages,
    setPage,
    enabled: !taskToDelete && !uploadOpen && !viewingTaskId,
  });

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      deleteMutation.mutate(taskToDelete, {
        onSuccess: () => {
          setTaskToDelete(null);
          toast.add({
            type: 'success',
            description: t('ielts.deleteSuccess'),
          });
        },
        onError: (err: any) => {
          const message = err?.response?.data?.message || err?.message || t('common.error');
          toast.add({
            type: 'error',
            description: message,
          });
        },
      });
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
      
      <Table>
        <TableHeader className="bg-muted/50 font-semibold">
          <TableRow className="h-[44px]">
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>{t('ielts.name')}</TableHead>
            <TableHead className="w-36">{t('ielts.date')}</TableHead>
            <TableHead className="w-40 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow className="h-[52px]">
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {t('common.loading')}
              </TableCell>
            </TableRow>
          ) : paginatedTasks.length > 0 ? (
            paginatedTasks.map((task, index) => (
              <TableRow key={task.id} className="h-[52px]">
                <TableCell className="w-12 text-center text-muted-foreground">
                  {(safePage - 1) * PAGE_SIZE + index + 1}
                </TableCell>
                <TableCell className="font-medium truncate">{task.title}</TableCell>
                <TableCell className="w-36 text-muted-foreground">{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="w-40 text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setViewingTaskId(task.id)}>
                    {t('ielts.view')}
                  </Button>
                  {isTeacher && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setTaskToDelete(task.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Icon icon="lucide:trash-2" className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow className="h-[200px]">
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                <Icon icon="lucide:book-open" className="mx-auto mb-2 h-8 w-8 opacity-50" />
                {t('ielts.emptyTasks')}
              </TableCell>
            </TableRow>
          )}
          {paginatedTasks.length > 0 && paginatedTasks.length < PAGE_SIZE && (
            Array.from({ length: PAGE_SIZE - paginatedTasks.length }).map((_, i) => (
              <TableRow key={`empty-${i}`} className="h-[52px] pointer-events-none select-none">
                <TableCell className="w-12 text-center text-muted-foreground">&nbsp;</TableCell>
                <TableCell>&nbsp;</TableCell>
                <TableCell className="w-36">&nbsp;</TableCell>
                <TableCell className="w-40 text-right">&nbsp;</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            {t('common.totalCount', { count: totalTasks, defaultValue: `Jami: ${totalTasks} ta` })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 1}
              onClick={() => setPage(safePage - 1)}
            >
              {t('common.prev')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === totalPages}
              onClick={() => setPage(safePage + 1)}
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
          type="READING" 
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
