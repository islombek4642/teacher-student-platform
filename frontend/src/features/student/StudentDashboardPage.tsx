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
  const { username, fullName } = useAuth();
  const [historyDialogTask, setHistoryDialogTask] = useState<{
    id: string;
    title: string;
    type?: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
  } | null>(null);
  const [viewerState, setViewerState] = useState<{
    taskId: string;
    mode: 'take' | 'review';
    submissionId?: string;
  } | null>(null);

  const { data: tasks } = useIeltsTasks();
  const { data: submissions } = useStudentMySubmissions();

  const listeningCount = tasks?.filter((tk) => tk.type === 'LISTENING').length;
  const readingCount = tasks?.filter((tk) => tk.type === 'READING').length;
  const writingCount = tasks?.filter((tk) => tk.type === 'WRITING').length;
  const totalCompleted = submissions?.length || 0;
  const bestBand =
    totalCompleted > 0
      ? Math.max(...submissions!.map((s) => s.band)).toFixed(1)
      : '—';
  const avgBand =
    totalCompleted > 0
      ? (
          submissions!.reduce((acc, s) => acc + s.band, 0) / totalCompleted
        ).toFixed(1)
      : '—';
  const totalTasks = tasks?.length ?? '—';

  // Prepare list of items for continuous seamless marquee
  const marqueeList = (() => {
    if (!submissions || submissions.length === 0) return [];
    let list = submissions.slice(0, 10);
    while (list.length < 5) {
      list = [...list, ...list];
    }
    return list;
  })();

  const renderCard = (sub: NonNullable<typeof submissions>[0], key: string) => {
    const isListening = sub.task?.type === 'LISTENING';
    const isWriting = sub.task?.type === 'WRITING';
    return (
      <div
        key={key}
        className="group relative flex w-[285px] sm:w-[320px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
      >
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant="secondary"
              className={`gap-1 font-semibold text-[11px] ${
                isListening
                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                  : isWriting
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
              }`}
            >
              <Icon
                icon={
                  isListening
                    ? 'lucide:headphones'
                    : isWriting
                    ? 'lucide:pen-tool'
                    : 'lucide:book-open'
                }
                className="h-3 w-3"
              />
              <span>
                {isListening
                  ? t('ielts.listening')
                  : isWriting
                  ? t('ielts.writing')
                  : t('ielts.reading')}
              </span>
            </Badge>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              <span className="font-semibold text-foreground">
                {new Date(sub.submittedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="mx-1 text-muted-foreground/40">•</span>
              <span>
                {new Date(sub.submittedAt).toLocaleDateString([], {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </span>
            </span>
          </div>

          <div>
            <h4 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {sub.task?.title || 'IELTS Test'}
            </h4>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {isWriting ? t('ielts.words', 'so\'z') : t('studentTasks.scoreHeader')}
            </div>
            <div className="text-sm font-extrabold text-foreground">
              {isWriting ? `${sub.total || 0} so'z` : `${sub.score} / ${sub.total}`}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isWriting ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600">
                <Icon icon="lucide:check-circle-2" className="h-3.5 w-3.5" />
                <span>{t('ielts.submittedBadge', 'Topshirildi')}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-black text-primary">
                <Icon icon="lucide:award" className="h-3.5 w-3.5" />
                <span>Band {sub.band}</span>
              </span>
            )}
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
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <Icon icon="lucide:line-chart" className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setViewerState({
                  taskId: sub.taskId,
                  mode: 'review',
                  submissionId: sub.id,
                })
              }
              className="h-7 text-xs px-2.5 gap-1 font-semibold"
            >
              <Icon icon="lucide:eye" className="h-3.5 w-3.5" />
              <span>{t('ielts.view')}</span>
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const statOrUndef = (count: number | undefined) =>
    count !== undefined && count > 0 ? t('dashboard.tasksCount', { count }) : undefined;

  return (
    <div className="space-y-6 pb-10 w-full min-w-0 max-w-full overflow-x-hidden">
      {/* 1. Compact Hero banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 shadow-xs">
        <div className="relative z-10 flex flex-col gap-1.5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              <Icon icon="lucide:sparkles" className="h-3.5 w-3.5" />
              <span>{t('dashboard.studentWelcome')}</span>
            </span>
          </div>
          <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-black tracking-tight text-foreground">
            <span>{t('dashboard.studentGreeting', { name: fullName || username })}</span>
            <Icon icon="lucide:graduation-cap" className="h-5 w-5 text-primary shrink-0" />
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('dashboard.studentSubtitle')}
          </p>
        </div>
        {/* Subtle decorative blob */}
        <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/10 blur-2xl" />
      </div>

      {/* 2. Recent Submissions Continuous Smooth Marquee */}
      <div className="space-y-3 w-full min-w-0 max-w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:history" className="h-5 w-5 text-primary" />
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {t('studentResults.recentTitle')}
            </h3>
            {submissions && submissions.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-extrabold text-primary">
                {submissions.length}
              </span>
            )}
          </div>

          {submissions && submissions.length > 0 && (
            <Link
              to="/student/results"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 hover:underline"
            >
              <span>{t('studentResults.viewAll')}</span>
              <Icon icon="lucide:arrow-right" className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {submissions && submissions.length > 0 ? (
          <div className="animate-marquee-wrapper relative w-full overflow-hidden rounded-2xl py-1 flex">
            {/* Subtle fade edges for smooth transition */}
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-background to-transparent" />

            <div
              className="animate-marquee-track flex gap-4 pr-4"
              style={{
                animationDuration: `${Math.max(25, marqueeList.length * 6)}s`,
              }}
            >
              {marqueeList.map((sub, index) => renderCard(sub, `t1-${sub.id}-${index}`))}
            </div>

            <div
              className="animate-marquee-track flex gap-4 pr-4"
              aria-hidden="true"
              style={{
                animationDuration: `${Math.max(25, marqueeList.length * 6)}s`,
              }}
            >
              {marqueeList.map((sub, index) => renderCard(sub, `t2-${sub.id}-${index}`))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/50 py-8 px-4 text-center">
            <Icon icon="lucide:clipboard-check" className="mb-2 h-8 w-8 text-primary opacity-40" />
            <div className="text-sm font-semibold text-foreground">
              {t('studentResults.noRecent')}
            </div>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              {t('studentResults.noRecentDesc')}
            </p>
          </div>
        )}
      </div>

      {/* 3. Stat summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('statistics.tasksCompleted'), value: totalCompleted, icon: 'lucide:check-circle-2', color: 'text-emerald-500' },
          { label: t('statistics.bestBand'), value: bestBand, icon: 'lucide:award', color: 'text-amber-500' },
          { label: t('statistics.overallBand'), value: avgBand, icon: 'lucide:trending-up', color: 'text-primary' },
          { label: t('statistics.availableTasks'), value: totalTasks, icon: 'lucide:layers', color: 'text-indigo-500' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border/60 bg-card px-4 py-5 text-center shadow-sm"
          >
            <Icon icon={item.icon} className={`h-5 w-5 ${item.color || 'text-muted-foreground'}`} />
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {item.value}
            </span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* 4. Navigation cards */}
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
          stat={statOrUndef(writingCount)}
          colorScheme="amber"
          ctaLabel={t('dashboard.start')}
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

      {viewerState && (
        <IeltsTaskViewer
          taskId={viewerState.taskId}
          mode={viewerState.mode}
          submissionId={viewerState.submissionId}
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
          onReviewAttempt={(id, submissionId) => {
            setHistoryDialogTask(null);
            setViewerState({ taskId: id, mode: 'review', submissionId });
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
