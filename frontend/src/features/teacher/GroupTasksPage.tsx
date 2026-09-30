import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { IeltsTaskViewer } from '@/features/ielts/IeltsTaskViewer';
import { useGroupTasks, useAssignGroupTask, type GroupTaskItem } from './api/group-tasks.api';
import { AssignTaskDialog } from './AssignTaskDialog';
import { toast } from '@/components/ui/toast';

export function GroupTasksPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const { data: tasks, isLoading } = useGroupTasks(groupId || '');
  const assignMutation = useAssignGroupTask();

  const [assignOpen, setAssignOpen] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [taskToUnassign, setTaskToUnassign] = useState<GroupTaskItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LISTENING' | 'READING'>('ALL');

  const assignedTasks = (tasks || []).filter((task) => task.isAssigned);
  const filteredTasks = assignedTasks.filter((task) => {
    if (typeFilter === 'ALL') return true;
    return task.type === typeFilter;
  });

  const handleConfirmUnassign = () => {
    if (!groupId || !taskToUnassign) return;

    assignMutation.mutate(
      { groupId, taskId: taskToUnassign.id, assign: false },
      {
        onSuccess: () => {
          toast.add({
            type: 'success',
            description: t('tasks.unassignSuccess'),
          });
          setTaskToUnassign(null);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || err?.message || t('common.error');
          toast.add({
            type: 'error',
            description: msg,
          });
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          {(['ALL', 'LISTENING', 'READING'] as const).map((filter) => (
            <Button
              key={filter}
              variant={typeFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTypeFilter(filter)}
              className="text-xs font-medium"
            >
              {filter === 'ALL'
                ? t('tasks.allTypes')
                : filter === 'LISTENING'
                ? t('ielts.listening')
                : t('ielts.reading')}
            </Button>
          ))}
        </div>

        <Button onClick={() => setAssignOpen(true)} className="gap-2">
          <Icon icon="lucide:plus" className="h-4 w-4" />
          <span>{t('tasks.assignTask')}</span>
        </Button>
      </div>

      {/* Tasks Table */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40 font-semibold">
            <TableRow className="h-[44px]">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>{t('ielts.name')}</TableHead>
              <TableHead className="w-32">{t('tasks.questionType')}</TableHead>
              <TableHead className="w-44">{t('ielts.name')}</TableHead>
              <TableHead className="w-32 text-center">{t('tasks.averageBand')}</TableHead>
              <TableHead className="w-32">{t('ielts.date')}</TableHead>
              <TableHead className="w-40 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="h-[52px]">
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map((task, index) => {
                const submissionPercent =
                  task.studentCount > 0
                    ? Math.round((task.submissionCount / task.studentCount) * 100)
                    : 0;

                return (
                  <TableRow key={task.id} className="h-[52px]">
                    <TableCell className="w-12 text-center text-muted-foreground font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {task.title}
                    </TableCell>
                    <TableCell className="w-32">
                      <Badge
                        variant="secondary"
                        className={`gap-1.5 font-semibold text-xs ${
                          task.type === 'LISTENING'
                            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                        }`}
                      >
                        <Icon
                          icon={
                            task.type === 'LISTENING'
                              ? 'lucide:headphones'
                              : 'lucide:book-open'
                          }
                          className="h-3 w-3"
                        />
                        <span>
                          {task.type === 'LISTENING'
                            ? t('ielts.listening')
                            : t('ielts.reading')}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="w-44">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground font-medium">
                          {t('tasks.assignedCount', {
                            submitted: task.submissionCount,
                            total: task.studentCount,
                          })}
                        </div>
                        <div className="h-1.5 w-28 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${submissionPercent}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="w-32 text-center">
                      {task.submissionCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          <Icon icon="lucide:award" className="h-3 w-3" />
                          <span>Band {task.averageBand}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="w-32 text-xs text-muted-foreground">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="w-40 text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingTaskId(task.id)}
                        className="text-xs"
                      >
                        {t('ielts.view')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTaskToUnassign(task)}
                        className="text-xs text-destructive hover:bg-destructive/10"
                        title={t('tasks.unassign')}
                      >
                        <Icon icon="lucide:unlink" className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow className="h-[200px]">
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <Icon icon="lucide:clipboard-list" className="mx-auto mb-2 h-10 w-10 opacity-40 text-primary" />
                  <div className="text-base font-semibold text-foreground">
                    {t('tasks.empty')}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                    {t('tasks.comingSoonDesc', {
                      defaultValue: "Guruhga topshiriq biriktirish uchun yuqoridagi 'Topshiriq biriktirish' tugmasini bosing.",
                    })}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setAssignOpen(true)}
                    className="mt-4 gap-1.5"
                  >
                    <Icon icon="lucide:plus" className="h-4 w-4" />
                    <span>{t('tasks.assignTask')}</span>
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {groupId && (
        <AssignTaskDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          groupId={groupId}
          currentTasks={tasks || []}
        />
      )}

      {viewingTaskId && (
        <IeltsTaskViewer
          taskId={viewingTaskId}
          onClose={() => setViewingTaskId(null)}
        />
      )}

      <ConfirmDialog
        open={!!taskToUnassign}
        onOpenChange={(open) => !open && setTaskToUnassign(null)}
        title={t('tasks.unassign')}
        description={t('tasks.confirmUnassign')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        variant="destructive"
        isLoading={assignMutation.isPending}
        onConfirm={handleConfirmUnassign}
      />
    </div>
  );
}
