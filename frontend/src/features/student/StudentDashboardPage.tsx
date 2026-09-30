import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { useAuth } from '@/auth/useAuth';
import { useIeltsTasks } from '@/features/ielts/api/ielts.api';
import { useStudentMySubmissions } from './api/student-results.api';
import { DashboardCard } from '@/components/shared/DashboardCard';
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
import { IeltsTaskViewer } from '@/features/ielts/IeltsTaskViewer';

export function StudentDashboardPage() {
  const { t } = useTranslation();
  const { username } = useAuth();
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);

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

      {/* Recent Submissions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:history" className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              {t('studentProgress.title')}
            </h3>
          </div>
          {submissions && submissions.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {submissions.length} ta topshirilgan test
            </span>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40 font-semibold">
              <TableRow className="h-[44px]">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>{t('ielts.name')}</TableHead>
                <TableHead className="w-32">{t('tasks.questionType')}</TableHead>
                <TableHead className="w-32 text-center">{t('studentTasks.score')}</TableHead>
                <TableHead className="w-32 text-center">IELTS Band</TableHead>
                <TableHead className="w-36 text-right">{t('ielts.date')}</TableHead>
                <TableHead className="w-28 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions && submissions.length > 0 ? (
                submissions.map((sub, index) => (
                  <TableRow key={sub.id} className="h-[52px]">
                    <TableCell className="w-12 text-center text-muted-foreground font-medium">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {sub.task?.title || 'IELTS Test'}
                    </TableCell>
                    <TableCell className="w-32">
                      {sub.task?.type && (
                        <Badge
                          variant="secondary"
                          className={`gap-1.5 font-semibold text-xs ${
                            sub.task.type === 'LISTENING'
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                          }`}
                        >
                          <Icon
                            icon={
                              sub.task.type === 'LISTENING'
                                ? 'lucide:headphones'
                                : 'lucide:book-open'
                            }
                            className="h-3 w-3"
                          />
                          <span>
                            {sub.task.type === 'LISTENING'
                              ? t('ielts.listening')
                              : t('ielts.reading')}
                          </span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="w-32 text-center text-sm font-semibold">
                      {sub.score} / {sub.total}
                    </TableCell>
                    <TableCell className="w-32 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-extrabold text-primary border border-primary/20">
                        <Icon icon="lucide:award" className="h-3 w-3" />
                        <span>Band {sub.band}</span>
                      </span>
                    </TableCell>
                    <TableCell className="w-36 text-right text-xs text-muted-foreground">
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="w-28 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingTaskId(sub.taskId)}
                        className="text-xs"
                      >
                        {t('ielts.view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow className="h-[160px]">
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    <Icon icon="lucide:clipboard-check" className="mx-auto mb-2 h-9 w-9 opacity-40 text-primary" />
                    <div className="text-sm font-semibold text-foreground">
                      {t('studentTasks.noTasks')}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('dashboard.studentSubtitle')}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {viewingTaskId && (
        <IeltsTaskViewer
          taskId={viewingTaskId}
          onClose={() => setViewingTaskId(null)}
        />
      )}
    </div>
  );
}
