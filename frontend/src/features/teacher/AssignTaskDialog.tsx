import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { useIeltsTasks } from '@/features/ielts/api/ielts.api';
import { useAssignGroupTask, type GroupTaskItem } from './api/group-tasks.api';
import { toast } from '@/components/ui/toast';
import { IeltsTaskViewer } from '@/features/ielts/IeltsTaskViewer';

interface AssignTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  currentTasks: GroupTaskItem[];
}

export function AssignTaskDialog({
  open,
  onOpenChange,
  groupId,
  currentTasks,
}: AssignTaskDialogProps) {
  const { t } = useTranslation();
  const { data: allTasks, isLoading } = useIeltsTasks();
  const assignMutation = useAssignGroupTask();
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);

  const assignedTaskIds = new Set(
    currentTasks.filter((ct) => ct.isAssigned).map((ct) => ct.id),
  );
  const availableTasks =
    allTasks?.filter((task) => !assignedTaskIds.has(task.id)) || [];

  const handleAssign = () => {
    if (!selectedTaskId) return;

    assignMutation.mutate(
      { groupId, taskId: selectedTaskId, assign: true },
      {
        onSuccess: () => {
          toast.add({
            type: 'success',
            description: t('tasks.assignSuccess'),
          });
          setSelectedTaskId('');
          onOpenChange(false);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Icon icon="lucide:plus-circle" className="h-5 w-5 text-primary" />
            {t('tasks.assignTask')}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : availableTasks.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Icon icon="lucide:check-circle-2" className="mx-auto mb-2 h-8 w-8 text-emerald-500 opacity-60" />
              {t('tasks.noTasksToAssign')}
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              <label className="text-sm font-medium text-foreground">
                {t('tasks.selectTask')}
              </label>
              {availableTasks.map((task) => {
                const isSelected = selectedTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border/60 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          task.type === 'LISTENING'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        <Icon
                          icon={
                            task.type === 'LISTENING'
                              ? 'lucide:headphones'
                              : 'lucide:book-open'
                          }
                          className="h-4 w-4"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground leading-tight">
                          {task.title}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize mt-0.5">
                          {task.type.toLowerCase()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTaskId(task.id);
                        }}
                        title={t('ielts.view')}
                      >
                        <Icon icon="lucide:eye" className="h-4 w-4" />
                      </Button>
                      {isSelected && (
                        <Icon
                          icon="lucide:check"
                          className="h-4 w-4 text-primary shrink-0"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={!selectedTaskId || assignMutation.isPending}
            onClick={handleAssign}
          >
            {t('tasks.assignTask')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {previewTaskId && (
      <IeltsTaskViewer
        taskId={previewTaskId}
        mode="review"
        onClose={() => setPreviewTaskId(null)}
      />
    )}
    </>
  );
}
