import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Task } from '@/api/types';

export function TaskViewDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task?.title}</DialogTitle>
          {task?.description && <DialogDescription>{task.description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          {task?.questions.map((question, index) => (
            <div key={question.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">
                  {index + 1}. {question.text}
                </p>
                <Badge variant="secondary" className="shrink-0">
                  {question.type === 'MULTIPLE_CHOICE' ? t('tasks.multipleChoice') : t('tasks.fillBlank')}
                </Badge>
              </div>
              {question.type === 'MULTIPLE_CHOICE' && question.options ? (
                <ul className="space-y-1 text-sm">
                  {question.options.map((option) => (
                    <li
                      key={option}
                      className={
                        option === question.correctAnswer
                          ? 'flex items-center gap-1.5 font-medium text-green-600'
                          : 'flex items-center gap-1.5 text-muted-foreground'
                      }
                    >
                      {option === question.correctAnswer && <Icon icon="lucide:check" className="h-3.5 w-3.5" />}
                      {option}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('tasks.correctAnswer')}:{' '}
                  <span className="font-medium text-foreground">{question.correctAnswer}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
