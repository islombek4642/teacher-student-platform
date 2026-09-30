import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@iconify/react';
import { useIeltsTasks } from '@/features/ielts/api/ielts.api';
import { useAssignMultipleGroupTasks, type GroupTaskItem } from './api/group-tasks.api';
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
  const assignMutation = useAssignMultipleGroupTasks();
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [previewTaskId, setPreviewTaskId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'LISTENING' | 'READING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const assignedTaskIds = useMemo(
    () => new Set(currentTasks.filter((ct) => ct.isAssigned).map((ct) => ct.id)),
    [currentTasks],
  );

  const availableTasks = useMemo(
    () => allTasks?.filter((task) => !assignedTaskIds.has(task.id)) || [],
    [allTasks, assignedTaskIds],
  );

  const filteredTasks = useMemo(() => {
    return availableTasks.filter((task) => {
      if (filterType !== 'ALL' && task.type !== filterType) return false;
      if (searchQuery.trim() && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [availableTasks, filterType, searchQuery]);

  const allFilteredSelected =
    filteredTasks.length > 0 &&
    filteredTasks.every((task) => selectedTaskIds.includes(task.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredTasks.map((t) => t.id));
      setSelectedTaskIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const combined = new Set([...selectedTaskIds, ...filteredTasks.map((t) => t.id)]);
      setSelectedTaskIds(Array.from(combined));
    }
  };

  const toggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId],
    );
  };

  const handleAssign = () => {
    if (selectedTaskIds.length === 0) return;

    assignMutation.mutate(
      { groupId, taskIds: selectedTaskIds, assign: true },
      {
        onSuccess: () => {
          toast.add({
            type: 'success',
            description:
              selectedTaskIds.length > 1
                ? t('tasks.assignMultipleSuccess')
                : t('tasks.assignSuccess'),
          });
          setSelectedTaskIds([]);
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

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedTaskIds([]);
      setSearchQuery('');
      setFilterType('ALL');
    }
    onOpenChange(isOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Icon icon="lucide:plus-circle" className="h-5 w-5 text-primary" />
              {t('tasks.assignTask')}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t('common.loading')}
              </div>
            ) : availableTasks.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Icon
                  icon="lucide:check-circle-2"
                  className="mx-auto mb-2 h-10 w-10 text-emerald-500 opacity-60"
                />
                {t('tasks.noTasksToAssign')}
              </div>
            ) : (
              <>
                {/* Search & Filter bar */}
                <div className="space-y-2">
                  <div className="relative">
                    <Icon
                      icon="lucide:search"
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
                    />
                    <Input
                      placeholder={t('tasks.searchTasksPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-xs h-9"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {(['ALL', 'LISTENING', 'READING'] as const).map((type) => (
                        <Button
                          key={type}
                          type="button"
                          variant={filterType === type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFilterType(type)}
                          className="h-7 px-2.5 text-xs font-medium"
                        >
                          {type === 'ALL'
                            ? t('tasks.allTypes')
                            : type === 'LISTENING'
                            ? t('ielts.listening')
                            : type === 'READING'
                            ? t('ielts.reading')
                            : type}
                        </Button>
                      ))}
                    </div>

                    {selectedTaskIds.length > 0 && (
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {t('tasks.selectedCount', { count: selectedTaskIds.length })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Select All Row */}
                {filteredTasks.length > 0 && (
                  <div className="flex items-center justify-between px-1 py-1 text-xs border-b border-border/40">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 font-medium text-foreground hover:text-primary transition-colors cursor-pointer select-none"
                    >
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                          allFilteredSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : selectedTaskIds.some((id) =>
                                filteredTasks.some((t) => t.id === id),
                              )
                            ? 'bg-primary/20 border-primary text-primary'
                            : 'border-muted-foreground/40 bg-background'
                        }`}
                      >
                        {allFilteredSelected ? (
                          <Icon icon="lucide:check" className="h-3 w-3 stroke-[3]" />
                        ) : selectedTaskIds.some((id) =>
                            filteredTasks.some((t) => t.id === id),
                          ) ? (
                          <Icon icon="lucide:minus" className="h-3 w-3 stroke-[3]" />
                        ) : null}
                      </div>
                      <span>
                        {allFilteredSelected
                          ? t('tasks.deselectAll')
                          : `${t('tasks.selectAll')} (${filteredTasks.length})`}
                      </span>
                    </button>

                    {selectedTaskIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedTaskIds([])}
                        className="text-muted-foreground hover:text-destructive text-xs cursor-pointer"
                      >
                        {t('tasks.deselectAll')}
                      </button>
                    )}
                  </div>
                )}

                {/* Tasks List */}
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
                  {filteredTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      {t('common.noResults', { defaultValue: 'Topshiriq topilmadi' })}
                    </div>
                  ) : (
                    filteredTasks.map((task) => {
                      const isSelected = selectedTaskIds.includes(task.id);
                      return (
                        <div
                          key={task.id}
                          onClick={() => toggleTask(task.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/80'
                              : 'border-border/60 hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div
                              className={`h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                isSelected
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-muted-foreground/40 bg-background'
                              }`}
                            >
                              {isSelected && (
                                <Icon icon="lucide:check" className="h-3 w-3 stroke-[3]" />
                              )}
                            </div>
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
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
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground leading-tight truncate">
                                {task.title}
                              </div>
                              <div className="text-xs text-muted-foreground capitalize mt-0.5">
                                {task.type.toLowerCase()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
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
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDialogChange(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              disabled={selectedTaskIds.length === 0 || assignMutation.isPending}
              onClick={handleAssign}
              className="gap-2"
            >
              {assignMutation.isPending && (
                <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
              )}
              <span>
                {selectedTaskIds.length > 1
                  ? t('tasks.assignMultipleTasks', { count: selectedTaskIds.length })
                  : t('tasks.assignTask')}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewTaskId && (
        <IeltsTaskViewer
          taskId={previewTaskId}
          mode="take"
          onClose={() => setPreviewTaskId(null)}
        />
      )}
    </>
  );
}
