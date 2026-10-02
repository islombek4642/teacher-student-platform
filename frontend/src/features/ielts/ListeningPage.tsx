import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import {
  useIeltsTasks,
  useBulkDeleteIeltsTasks,
  type IeltsSubmission,
} from './api/ielts.api';
import { UploadIeltsDialog } from './UploadIeltsDialog';
import { IeltsTaskViewer } from './IeltsTaskViewer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/auth/useAuth';
import { usePaginationKeyboard } from '@/hooks/usePaginationKeyboard';
import { Badge } from '@/components/ui/badge';
import { useStudentMySubmissions } from '@/features/student/api/student-results.api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Listening IELTS Tasks Page
export function ListeningPage() {
  const { t } = useTranslation();
  const { payload } = useAuth();
  const isTeacher = payload?.role === 'TEACHER' || payload?.role === 'SUPER_ADMIN';
  const isStudent = payload?.role === 'STUDENT';

  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerState, setViewerState] = useState<{
    taskId: string;
    mode: 'take' | 'review';
    submissionId?: string;
  } | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isInitialConfirmOpen, setIsInitialConfirmOpen] = useState(false);
  const [isWarningConfirmOpen, setIsWarningConfirmOpen] = useState(false);

  const { data: tasks, isLoading } = useIeltsTasks();
  const { data: mySubmissions } = useStudentMySubmissions(isStudent);
  const bulkDeleteMutation = useBulkDeleteIeltsTasks();

  const submissionsMap = new Map<string, IeltsSubmission & { bestBand: number }>();
  if (mySubmissions) {
    for (const s of mySubmissions) {
      const existing = submissionsMap.get(s.taskId);
      const isNewer =
        !existing ||
        (s.attempt !== undefined && existing.attempt !== undefined
          ? s.attempt > existing.attempt
          : new Date(s.submittedAt).getTime() > new Date(existing.submittedAt).getTime());

      const bestBand = existing ? Math.max(existing.bestBand, s.band) : s.band;

      if (isNewer) {
        submissionsMap.set(s.taskId, { ...s, bestBand });
      } else {
        existing.bestBand = bestBand;
      }
    }
  }
  
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const listeningTasks = tasks?.filter((t) => t.type === 'LISTENING') || [];
  const totalTasks = listeningTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalTasks / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedTasks = listeningTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allCurrentPageSelected =
    paginatedTasks.length > 0 &&
    paginatedTasks.every((task) => selectedRowIds.includes(task.id));

  const toggleSelectAllCurrentPage = () => {
    if (allCurrentPageSelected) {
      const pageIdSet = new Set(paginatedTasks.map((t) => t.id));
      setSelectedRowIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    } else {
      const combined = new Set([...selectedRowIds, ...paginatedTasks.map((t) => t.id)]);
      setSelectedRowIds(Array.from(combined));
    }
  };

  const selectAllTotal = () => {
    setSelectedRowIds(listeningTasks.map((t) => t.id));
  };

  const toggleRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectedTasks = useMemo(() => {
    const set = new Set(selectedRowIds);
    return (listeningTasks || []).filter((t) => set.has(t.id));
  }, [listeningTasks, selectedRowIds]);

  const activeUsageStats = useMemo(() => {
    let groupsCount = 0;
    let submissionsCount = 0;
    for (const t of selectedTasks) {
      groupsCount += t._count?.groupTasks || 0;
      submissionsCount += t._count?.submissions || 0;
    }
    return {
      isInUse: groupsCount > 0 || submissionsCount > 0,
      groupsCount,
      submissionsCount,
    };
  }, [selectedTasks]);

  usePaginationKeyboard({
    page: safePage,
    totalPages,
    setPage,
    enabled: !isInitialConfirmOpen && !isWarningConfirmOpen && !uploadOpen && !viewerState,
  });

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const executeBulkDelete = () => {
    if (selectedRowIds.length === 0) return;
    const count = selectedRowIds.length;
    bulkDeleteMutation.mutate(selectedRowIds, {
      onSuccess: () => {
        setSelectedRowIds([]);
        setIsInitialConfirmOpen(false);
        setIsWarningConfirmOpen(false);
        toast.add({
          type: 'success',
          description: t('ielts.bulkDeleteSuccess', {
            count,
            defaultValue: `${count} ta topshiriq muvaffaqiyatli o'chirildi`,
          }),
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
  };

  const handleInitialConfirm = () => {
    if (activeUsageStats.isInUse) {
      // Step 2: Open warning confirmation for active tasks
      setIsInitialConfirmOpen(false);
      setIsWarningConfirmOpen(true);
    } else {
      executeBulkDelete();
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

      {isTeacher && selectedRowIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl text-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-primary">
              {t('ielts.selectedCount', {
                count: selectedRowIds.length,
                defaultValue: `${selectedRowIds.length} ta topshiriq tanlandi`,
              })}
            </span>
            {selectedRowIds.length < totalTasks && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-primary underline font-medium text-xs cursor-pointer"
                onClick={selectAllTotal}
              >
                {t('ielts.selectAllTotal', {
                  total: totalTasks,
                  defaultValue: `Barcha ${totalTasks} ta topshiriqni tanlash`,
                })}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRowIds([])}
              className="h-8 text-xs cursor-pointer"
            >
              {t('ielts.deselectAll', { defaultValue: 'Tanlovni bekor qilish' })}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsInitialConfirmOpen(true)}
              disabled={bulkDeleteMutation.isPending}
              className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Icon icon="lucide:trash-2" className="h-3.5 w-3.5" />
              <span>
                {t('ielts.deleteSelected', {
                  count: selectedRowIds.length,
                  defaultValue: `O'chirish (${selectedRowIds.length})`,
                })}
              </span>
            </Button>
          </div>
        </div>
      )}
      
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50 font-semibold">
            <TableRow className="h-[44px]">
              {isTeacher && (
                <TableHead className="w-10 text-center">
                  <div
                    onClick={toggleSelectAllCurrentPage}
                    className={`h-4 w-4 rounded border mx-auto flex items-center justify-center transition-colors cursor-pointer select-none ${
                      allCurrentPageSelected
                        ? 'bg-primary border-primary text-primary-foreground'
                        : selectedRowIds.some((id) =>
                            paginatedTasks.some((t) => t.id === id),
                          )
                        ? 'bg-primary/20 border-primary text-primary'
                        : 'border-muted-foreground/40 bg-background'
                    }`}
                    title={allCurrentPageSelected ? t('ielts.deselectAll') : t('ielts.selectAllPage')}
                  >
                    {allCurrentPageSelected ? (
                      <Icon icon="lucide:check" className="h-3 w-3 stroke-[3]" />
                    ) : selectedRowIds.some((id) =>
                        paginatedTasks.some((t) => t.id === id),
                      ) ? (
                      <Icon icon="lucide:minus" className="h-3 w-3 stroke-[3]" />
                    ) : null}
                  </div>
                </TableHead>
              )}
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>{t('ielts.name')}</TableHead>
              <TableHead className="w-44">{t('ielts.uploadedDate')}</TableHead>
              <TableHead className="w-28 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="h-[52px]">
                <TableCell colSpan={isTeacher ? 5 : 4} className="text-center text-muted-foreground">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : paginatedTasks.length > 0 ? (
              paginatedTasks.map((task, index) => {
                const isSelected = selectedRowIds.includes(task.id);
                return (
                  <TableRow
                    key={task.id}
                    className={`h-[52px] transition-colors ${
                      isSelected ? 'bg-primary/5' : ''
                    }`}
                  >
                    {isTeacher && (
                      <TableCell className="w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <div
                          onClick={() => toggleRow(task.id)}
                          className={`h-4 w-4 rounded border mx-auto flex items-center justify-center transition-colors cursor-pointer select-none ${
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-muted-foreground/40 bg-background hover:border-primary/50'
                          }`}
                        >
                          {isSelected && (
                            <Icon icon="lucide:check" className="h-3 w-3 stroke-[3]" />
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="w-12 text-center text-muted-foreground">
                      {(safePage - 1) * PAGE_SIZE + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{task.title}</span>
                        {isStudent && submissionsMap.has(task.id) && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs gap-1 shrink-0 font-bold"
                          >
                            <Icon icon="lucide:check" className="h-3 w-3" />
                            <span>Band {submissionsMap.get(task.id)!.bestBand ?? submissionsMap.get(task.id)!.band}</span>
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="w-44 text-muted-foreground whitespace-nowrap text-xs">
                      <span className="font-semibold text-foreground">
                        {new Date(task.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="mx-1.5 text-muted-foreground/40">•</span>
                      <span>
                        {new Date(task.createdAt).toLocaleDateString([], {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="w-28 text-right">
                      <Button
                        variant={isStudent && submissionsMap.has(task.id) ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => {
                          if (isStudent && submissionsMap.has(task.id)) {
                            const sub = submissionsMap.get(task.id);
                            setViewerState({ taskId: task.id, mode: 'review', submissionId: sub?.id });
                          } else {
                            setViewerState({ taskId: task.id, mode: 'take' });
                          }
                        }}
                      >
                        {isStudent && !submissionsMap.has(task.id)
                          ? t('studentTasks.open', { defaultValue: 'Boshlash' })
                          : t('ielts.view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow className="h-[200px]">
                <TableCell colSpan={isTeacher ? 5 : 4} className="text-center text-muted-foreground py-8">
                  <Icon icon="lucide:headphones" className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  {t('ielts.emptyTasks')}
                </TableCell>
              </TableRow>
            )}
            {paginatedTasks.length > 0 && paginatedTasks.length < PAGE_SIZE && (
              Array.from({ length: PAGE_SIZE - paginatedTasks.length }).map((_, i) => (
                <TableRow key={`empty-${i}`} className="h-[52px] pointer-events-none select-none">
                  {isTeacher && <TableCell className="w-10 text-center">&nbsp;</TableCell>}
                  <TableCell className="w-12 text-center text-muted-foreground">&nbsp;</TableCell>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell className="w-44">&nbsp;</TableCell>
                  <TableCell className="w-28 text-right">&nbsp;</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
          type="LISTENING" 
        />
      )}
      {viewerState && (
        <IeltsTaskViewer 
          taskId={viewerState.taskId} 
          mode={viewerState.mode}
          submissionId={viewerState.submissionId}
          onRetake={() => setViewerState({ taskId: viewerState.taskId, mode: 'take' })}
          onClose={() => setViewerState(null)} 
        />
      )}

      {/* Step 1: Initial Confirm Dialog */}
      <ConfirmDialog
        open={isInitialConfirmOpen}
        onOpenChange={(open) => !open && setIsInitialConfirmOpen(false)}
        title={t('common.confirmDelete')}
        description={t('ielts.confirmBulkDelete', {
          count: selectedRowIds.length,
          defaultValue: `Haqiqatan ham tanlangan ${selectedRowIds.length} ta topshiriqni o'chirmoqchimisiz?`,
        })}
        confirmText={
          activeUsageStats.isInUse
            ? t('common.next', { defaultValue: 'Davom etish' })
            : t('common.delete', { defaultValue: "O'chirish" })
        }
        cancelText={t('common.cancel')}
        variant="destructive"
        isLoading={bulkDeleteMutation.isPending && !activeUsageStats.isInUse}
        onConfirm={handleInitialConfirm}
      />

      {/* Step 2: Warning Confirm Dialog (Only if tasks are assigned or have submissions) */}
      <ConfirmDialog
        open={isWarningConfirmOpen}
        onOpenChange={(open) => !open && setIsWarningConfirmOpen(false)}
        title={t('ielts.activeTasksWarningTitle', {
          defaultValue: 'Diqqat: Topshiriqlar faol ishlatilmoqda!',
        })}
        description={t('ielts.activeTasksWarningDesc', {
          groups: activeUsageStats.groupsCount,
          submissions: activeUsageStats.submissionsCount,
          defaultValue: `Tanlangan topshiriqlar guruhlarga biriktirilgan (${activeUsageStats.groupsCount} ta) yoki o'quvchilar tomonidan bajarilgan (${activeUsageStats.submissionsCount} ta natija). Agar ularni o'chirsangiz, barcha o'quvchilarning natijalari va ballari ham butunlay yo'qoladi. Haqiqatan ham yakuniy o'chirishni tasdiqlaysizmi?`,
        })}
        confirmText={t('ielts.confirmFinalDelete', {
          defaultValue: "Ha, baribir o'chirilsin",
        })}
        cancelText={t('common.cancel')}
        variant="destructive"
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={executeBulkDelete}
      />
    </div>
  );
}
