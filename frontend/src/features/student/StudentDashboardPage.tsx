import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { useAuth } from '@/auth/useAuth';
import { useIeltsTasks } from '@/features/ielts/api/ielts.api';
import { useStudentMySubmissions } from './api/student-results.api';
import { DashboardCard } from '@/components/shared/DashboardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IeltsTaskViewer } from '@/features/ielts/IeltsTaskViewer';
import { AttemptHistoryDialog } from './AttemptHistoryDialog';

export function StudentDashboardPage() {
  const { t } = useTranslation();
  const { username } = useAuth();
  const [historyDialogTask, setHistoryDialogTask] = useState<{
    id: string;
    title: string;
    type?: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
  } | null>(null);
  const [viewerState, setViewerState] = useState<{
    taskId: string;
    mode: 'take' | 'review';
  } | null>(null);

  const { data: tasks } = useIeltsTasks();
  const { data: submissions } = useStudentMySubmissions();

  const listeningCount = tasks?.filter((tk) => tk.type === 'LISTENING').length;
  const readingCount = tasks?.filter((tk) => tk.type === 'READING').length;
  const totalCompleted = submissions?.length || 0;
  const avgBand =
    totalCompleted > 0
      ? (
          submissions!.reduce((acc, s) => acc + s.band, 0) / totalCompleted
        ).toFixed(1)
      : '—';

  const statOrUndef = (count: number | undefined) =>
    count !== undefined && count > 0 ? t('dashboard.tasksCount', { count }) : undefined;

  return (
    <div className="space-y-8 pb-10">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-10 shadow-sm">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Icon icon="lucide:target" className="h-3.5 w-3.5" />
            <span>{t('dashboard.studentWelcome')}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {t('dashboard.studentGreeting', { name: username })}
          </h1>
          <p className="text-base text-muted-foreground">
            {t('dashboard.studentSubtitle')}
          </p>
        </div>
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />
      </div>

      {/* Stat summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('ielts.listening'), value: listeningCount ?? '—', icon: 'lucide:headphones' },
          { label: t('ielts.reading'), value: readingCount ?? '—', icon: 'lucide:book-open' },
          { label: t('statistics.tasksCompleted'), value: totalCompleted, icon: 'lucide:check-circle-2' },
          { label: t('statistics.groupAverageBand'), value: avgBand, icon: 'lucide:award' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border/60 bg-card px-4 py-5 text-center shadow-sm"
          >
            <Icon icon={item.icon} className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {item.value}
            </span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Navigation cards */}
      <div className="grid gap-5 sm:grid-cols-2">
        <DashboardCard
          to="/student/ielts/listening"
          title={t('ielts.listening')}
          description={t('dashboard.listeningDesc')}
          icon="lucide:headphones"
          stat={statOrUndef(listeningCount)}
          colorScheme="purple"
          ctaLabel={t('dashboard.start')}
        />
        <DashboardCard
          to="/student/ielts/reading"
          title={t('ielts.reading')}
          description={t('dashboard.readingDesc')}
          icon="lucide:book-open"
          stat={statOrUndef(readingCount)}
          colorScheme="emerald"
          ctaLabel={t('dashboard.start')}
        />
        <DashboardCard
          to="/student/ielts/writing"
          title={t('ielts.writing')}
          description={t('dashboard.writingDesc')}
          icon="lucide:pen-tool"
          badge={t('dashboard.comingSoon')}
          colorScheme="amber"
          disabled
          ctaLabel={t('dashboard.comingSoon')}
        />
        <DashboardCard
          to="/student/ielts/speaking"
          title={t('ielts.speaking')}
          description={t('dashboard.speakingDesc')}
          icon="lucide:mic"
          badge={t('dashboard.comingSoon')}
          colorScheme="rose"
          disabled
          ctaLabel={t('dashboard.comingSoon')}
        />
      </div>

      {/* Recent Submissions Section (Last 3 Cards) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:history" className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              {t('studentResults.recentTitle')}
            </h3>
          </div>
          {submissions && submissions.length > 0 && (
            <Link
              to="/student/results"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80 hover:underline"
            >
              <span>{t('studentResults.viewAll')}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                {submissions.length}
              </span>
              <Icon icon="lucide:arrow-right" className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {submissions && submissions.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {submissions.slice(0, 3).map((sub) => {
              const isListening = sub.task?.type === 'LISTENING';
              return (
                <div
                  key={sub.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="secondary"
                        className={`gap-1.5 font-semibold text-xs ${
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
                      <span className="text-xs text-muted-foreground">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-foreground line-clamp-2">
                        {sub.task?.title || 'IELTS Test'}
                      </h4>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {t('studentTasks.scoreHeader')}
                      </div>
                      <div className="text-base font-extrabold text-foreground">
                        {sub.score} / {sub.total}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">
                        <Icon icon="lucide:award" className="h-3.5 w-3.5" />
                        <span>Band {sub.band}</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t('studentResults.attemptsHistory', "Urinishlar tarixi")}
                        onClick={() =>
                          setHistoryDialogTask({
                            id: sub.taskId,
                            title: sub.task?.title || 'IELTS Test',
                            type: sub.task?.type,
                          })
                        }
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Icon icon="lucide:line-chart" className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setViewerState({
                            taskId: sub.taskId,
                            mode: 'review',
                          })
                        }
                        className="h-8 text-xs gap-1"
                      >
                        <Icon icon="lucide:eye" className="h-3.5 w-3.5" />
                        <span>{t('ielts.view')}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/50 py-10 px-4 text-center">
            <Icon icon="lucide:clipboard-check" className="mb-2 h-9 w-9 text-primary opacity-40" />
            <div className="text-sm font-semibold text-foreground">
              {t('studentResults.noRecent')}
            </div>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {t('studentResults.noRecentDesc')}
            </p>
          </div>
        )}
      </div>

      {viewerState && (
        <IeltsTaskViewer
          taskId={viewerState.taskId}
          mode={viewerState.mode}
          onRetake={() => setViewerState({ taskId: viewerState.taskId, mode: 'take' })}
          onClose={() => setViewerState(null)}
        />
      )}

      {historyDialogTask && (
        <AttemptHistoryDialog
          open={!!historyDialogTask}
          onOpenChange={(open) => !open && setHistoryDialogTask(null)}
          taskId={historyDialogTask.id}
          taskTitle={historyDialogTask.title}
          taskType={historyDialogTask.type}
          onReviewAttempt={(id) => {
            setHistoryDialogTask(null);
            setViewerState({ taskId: id, mode: 'review' });
          }}
          onRetake={(id) => {
            setHistoryDialogTask(null);
            setViewerState({ taskId: id, mode: 'take' });
          }}
        />
      )}
    </div>
  );
}
