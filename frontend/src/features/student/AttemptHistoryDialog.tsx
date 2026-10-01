import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStudentTaskAttempts } from './api/student-results.api';
import { AttemptProgressChart } from './AttemptProgressChart';

interface AttemptHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  taskType?: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
  onReviewAttempt: (taskId: string, submissionId?: string) => void;
  onRetake: (taskId: string) => void;
}

export function AttemptHistoryDialog({
  open,
  onOpenChange,
  taskId,
  taskTitle,
  taskType,
  onReviewAttempt,
  onRetake,
}: AttemptHistoryDialogProps) {
  const { t } = useTranslation();
  const { data: attempts, isLoading } = useStudentTaskAttempts(taskId, open);

  const isListening = taskType === 'LISTENING';
  const attemptsList = attempts || [];
  const bestBand =
    attemptsList.length > 0 ? Math.max(...attemptsList.map((a) => a.band)) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            {taskType && (
              <Badge
                variant="secondary"
                className={`gap-1 font-semibold text-xs ${
                  isListening
                    ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                }`}
              >
                <Icon
                  icon={isListening ? 'lucide:headphones' : 'lucide:book-open'}
                  className="h-3 w-3"
                />
                <span>{isListening ? t('ielts.listening') : t('ielts.reading')}</span>
              </Badge>
            )}
            {bestBand > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-black text-primary border border-primary/20">
                <Icon icon="lucide:award" className="h-3 w-3" />
                <span>{t('studentResults.bestBand', { band: bestBand })}</span>
              </span>
            )}
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground line-clamp-2">
            {taskTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Progress Chart */}
          {attemptsList.length > 0 && (
            <AttemptProgressChart attempts={attemptsList} />
          )}

          {/* Attempts List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              <span>{t('studentResults.attemptsHistory')} ({attemptsList.length})</span>
            </div>

            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
              {isLoading ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  {t('common.loading')}
                </div>
              ) : attemptsList.length > 0 ? (
                attemptsList
                  .slice()
                  .reverse()
                  .map((att, idx) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3 shadow-xs hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-black text-xs">
                          #{att.attempt || attemptsList.length - idx}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground">
                            {att.score} / {att.total}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">
                              {new Date(att.submittedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            <span>
                              {new Date(att.submittedAt).toLocaleDateString([], {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-black text-primary border border-primary/20">
                          Band {att.band}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onOpenChange(false);
                            onReviewAttempt(taskId, att.id);
                          }}
                          className="h-7 text-xs"
                        >
                          {t('studentResults.review')}
                        </Button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  {t('studentResults.noRecent')}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            {t('common.close')}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onRetake(taskId);
            }}
            className="gap-1.5 text-xs font-semibold"
          >
            <Icon icon="lucide:rotate-ccw" className="h-3.5 w-3.5" />
            <span>{t('studentResults.retakeTest')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
