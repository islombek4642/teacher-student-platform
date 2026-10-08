import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import {
  useIeltsTasks,
  useBulkDeleteIeltsTasks,
  useSubmissionsToGrade,
  type IeltsSubmission,
  type SubmissionToGrade,
  type IeltsTask,
} from './api/ielts.api';
import { CreateSpeakingTaskDialog } from './CreateSpeakingTaskDialog';
import { SpeakingTaskRunner } from './SpeakingTaskRunner';
import { SpeakingGradingDialog } from './SpeakingGradingDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { toast } from '@/components/ui/toast';
import { useAuth } from '@/auth/useAuth';
import { usePaginationKeyboard } from '@/hooks/usePaginationKeyboard';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentMySubmissions } from '@/features/student/api/student-results.api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function SpeakingPage() {
  const { t } = useTranslation();
  const { payload } = useAuth();
  const isTeacher = payload?.role === 'TEACHER' || payload?.role === 'SUPER_ADMIN';
  const isStudent = payload?.role === 'STUDENT';

  const [createOpen, setCreateOpen] = useState(false);
  const [runnerState, setRunnerState] = useState<{
    task: IeltsTask;
    mode: 'take' | 'review';
    submission?: any;
  } | null>(null);

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isInitialConfirmOpen, setIsInitialConfirmOpen] = useState(false);

  const [teacherViewTab, setTeacherViewTab] = useState<'tasks' | 'reviews'>('tasks');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [gradingSubmission, setGradingSubmission] = useState<SubmissionToGrade | null>(null);
  const [gradingOpen, setGradingOpen] = useState(false);

  const { data: tasks, isLoading } = useIeltsTasks();
  const { data: mySubmissions } = useStudentMySubmissions(isStudent);
  const { data: allSubmissionsToGrade, isLoading: isReviewsLoading } = useSubmissionsToGrade();
  const bulkDeleteMutation = useBulkDeleteIeltsTasks();

  const speakingSubmissionsToGrade = useMemo(() => {
    return (allSubmissionsToGrade || []).filter((s) => s.task.type === 'SPEAKING');
  }, [allSubmissionsToGrade]);

  const pendingReviewsCount = speakingSubmissionsToGrade.filter((s) => !s.isGraded).length;

  const filteredSubmissions = useMemo(() => {
    if (reviewFilter === 'pending') return speakingSubmissionsToGrade.filter((s) => !s.isGraded);
    if (reviewFilter === 'graded') return speakingSubmissionsToGrade.filter((s) => s.isGraded);
    return speakingSubmissionsToGrade;
  }, [speakingSubmissionsToGrade, reviewFilter]);

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

  const speakingTasks = tasks?.filter((t) => t.type === 'SPEAKING') || [];
  const totalTasks = speakingTasks.length;
  const totalPages = Math.max(1, Math.ceil(totalTasks / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedTasks = speakingTasks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
    setSelectedRowIds(speakingTasks.map((t) => t.id));
  };

  const toggleRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  usePaginationKeyboard({
    page: safePage,
    totalPages,
    setPage,
    enabled: !isInitialConfirmOpen && !createOpen && !runnerState && !gradingOpen,
  });

  const executeBulkDelete = () => {
    if (selectedRowIds.length === 0) return;
    const count = selectedRowIds.length;
    bulkDeleteMutation.mutate(selectedRowIds, {
      onSuccess: () => {
        setSelectedRowIds([]);
        setIsInitialConfirmOpen(false);
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

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('ielts.speaking')}
        action={
          isTeacher ? (
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Icon icon="lucide:plus" className="w-4 h-4" />
              {t('speaking.newTask', { defaultValue: 'Yangi Speaking topshirig\'i' })}
            </Button>
          ) : undefined
        }
      />

      {isTeacher && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
          <Tabs
            value={teacherViewTab}
            onValueChange={(val: any) => setTeacherViewTab(val)}
          >
            <TabsList>
              <TabsTrigger value="tasks" className="gap-2">
                <Icon icon="lucide:file-text" className="w-4 h-4" />
                <span>{t('grading.tasksTab', { defaultValue: "Topshiriqlar ro'yxati" })}</span>
              </TabsTrigger>
              <TabsTrigger value="reviews" className="gap-2">
                <Icon icon="lucide:check-square" className="w-4 h-4" />
                <span>{t('speaking.reviewsTab', { defaultValue: 'Javoblarni tekshirish' })}</span>
                {pendingReviewsCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold">
                    {pendingReviewsCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {teacherViewTab === 'reviews' && (
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg">
              <Button
                variant={reviewFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setReviewFilter('all')}
              >
                {t('grading.filterAll', { defaultValue: 'Barchasi' })} ({speakingSubmissionsToGrade.length})
              </Button>
              <Button
                variant={reviewFilter === 'pending' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setReviewFilter('pending')}
              >
                {t('grading.filterPending', { defaultValue: 'Baholanmaganlar' })} ({pendingReviewsCount})
              </Button>
              <Button
                variant={reviewFilter === 'graded' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setReviewFilter('graded')}
              >
                {t('grading.filterGraded', { defaultValue: 'Baholanganlar' })} ({speakingSubmissionsToGrade.length - pendingReviewsCount})
              </Button>
            </div>
          )}
        </div>
      )}

      {isTeacher && teacherViewTab === 'tasks' && selectedRowIds.length > 0 && (
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

      {isTeacher && teacherViewTab === 'reviews' ? (
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50 font-semibold">
              <TableRow className="h-[44px]">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>{t('grading.student', { defaultValue: "O'quvchi" })}</TableHead>
                <TableHead className="w-36">{t('grading.group', { defaultValue: 'Guruh' })}</TableHead>
                <TableHead>{t('grading.task', { defaultValue: 'Topshiriq' })}</TableHead>
                <TableHead className="w-36">{t('grading.submittedAt', { defaultValue: 'Topshirilgan sana' })}</TableHead>
                <TableHead className="w-28 text-center">{t('grading.status', { defaultValue: 'Holat' })}</TableHead>
                <TableHead className="w-24 text-center">{t('grading.band', { defaultValue: 'Band' })}</TableHead>
                <TableHead className="w-28 text-right">{t('grading.action', { defaultValue: 'Amal' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isReviewsLoading ? (
                <TableRow className="h-[52px]">
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub, index) => (
                  <TableRow key={sub.id} className="h-[52px] transition-colors">
                    <TableCell className="w-12 text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {sub.student.firstName} {sub.student.lastName}
                    </TableCell>
                    <TableCell className="w-36 text-muted-foreground text-xs">
                      {sub.student.group?.name || '-'}
                    </TableCell>
                    <TableCell className="truncate max-w-[200px] text-xs">
                      {sub.task.title}
                    </TableCell>
                    <TableCell className="w-36 text-muted-foreground text-xs">
                      {new Date(sub.submittedAt).toLocaleDateString([], {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="w-28 text-center">
                      <Badge variant={sub.isGraded ? 'default' : 'secondary'} className="text-[10px]">
                        {sub.isGraded
                          ? t('grading.graded', { defaultValue: 'Baholangan' })
                          : t('grading.ungraded', { defaultValue: 'Baholanmagan' })}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-24 text-center font-bold text-sm">
                      {sub.isGraded ? `Band ${sub.band}` : '-'}
                    </TableCell>
                    <TableCell className="w-28 text-right">
                      <Button
                        size="sm"
                        variant={sub.isGraded ? 'outline' : 'default'}
                        onClick={() => {
                          setGradingSubmission(sub);
                          setGradingOpen(true);
                        }}
                        className="text-xs font-semibold"
                      >
                        {sub.isGraded
                          ? t('grading.regrade', { defaultValue: 'Qayta baholash' })
                          : t('grading.grade', { defaultValue: 'Baholash' })}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="h-[180px]">
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    <Icon icon="lucide:check-circle-2" className="mx-auto mb-2 h-8 w-8 opacity-50 text-emerald-500" />
                    {t('speaking.noSubmissions', { defaultValue: 'Tekshirish uchun Speaking javoblari mavjud emas' })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
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
                          ? 'border-primary bg-primary/20'
                          : 'border-muted-foreground/40 bg-background hover:border-primary/50'
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
                  const studentSubmission = submissionsMap.get(task.id);

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
                          {isStudent && studentSubmission && (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs gap-1 shrink-0 font-bold"
                            >
                              <Icon icon="lucide:check" className="h-3 w-3" />
                              <span>
                                {studentSubmission.band > 0
                                  ? `Band ${studentSubmission.band}`
                                  : t('grading.ungraded', { defaultValue: 'Topshirildi' })}
                              </span>
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
                          variant={isStudent && studentSubmission ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => {
                            if (isStudent && studentSubmission) {
                              setRunnerState({
                                task,
                                mode: 'review',
                                submission: studentSubmission,
                              });
                            } else {
                              setRunnerState({
                                task,
                                mode: 'take',
                              });
                            }
                          }}
                        >
                          {isStudent && !studentSubmission
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
                    <Icon icon="lucide:mic" className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    {t('speaking.emptyTasks', { defaultValue: 'Hali Speaking topshiriqlari mavjud emas' })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && teacherViewTab === 'tasks' && (
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
        <CreateSpeakingTaskDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}

      {runnerState && (
        <SpeakingTaskRunner
          taskId={runnerState.task.id}
          taskTitle={runnerState.task.title}
          contentHtml={runnerState.task.contentHtml || ''}
          mode={runnerState.mode}
          existingSubmission={runnerState.submission}
          onClose={() => setRunnerState(null)}
        />
      )}

      <SpeakingGradingDialog
        submission={gradingSubmission}
        open={gradingOpen}
        onOpenChange={(open) => {
          setGradingOpen(open);
          if (!open) setGradingSubmission(null);
        }}
      />

      <ConfirmDialog
        open={isInitialConfirmOpen}
        onOpenChange={(open) => !open && setIsInitialConfirmOpen(false)}
        title={t('common.confirmDelete')}
        description={t('ielts.confirmBulkDelete', {
          count: selectedRowIds.length,
          defaultValue: `Haqiqatan ham tanlangan ${selectedRowIds.length} ta topshiriqni o'chirmoqchimisiz?`,
        })}
        confirmText={t('common.delete', { defaultValue: "O'chirish" })}
        cancelText={t('common.cancel')}
        variant="destructive"
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={executeBulkDelete}
      />
    </div>
  );
}
