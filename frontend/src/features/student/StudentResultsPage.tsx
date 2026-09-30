import { useState } from 'react';
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
import { useStudentMySubmissions } from './api/student-results.api';
import { IeltsTaskViewer } from '@/features/ielts/IeltsTaskViewer';

export function StudentResultsPage() {
  const { t } = useTranslation();
  const { data: submissions, isLoading } = useStudentMySubmissions();
  const [selectedType, setSelectedType] = useState<'ALL' | 'LISTENING' | 'READING'>('ALL');
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);

  const allSubmissions = submissions || [];
  const listeningSubs = allSubmissions.filter((s) => s.task?.type === 'LISTENING');
  const readingSubs = allSubmissions.filter((s) => s.task?.type === 'READING');

  const totalCompleted = allSubmissions.length;
  const avgBand =
    totalCompleted > 0
      ? (allSubmissions.reduce((acc, s) => acc + s.band, 0) / totalCompleted).toFixed(1)
      : '—';

  const listeningAvg =
    listeningSubs.length > 0
      ? (listeningSubs.reduce((acc, s) => acc + s.band, 0) / listeningSubs.length).toFixed(1)
      : '—';

  const readingAvg =
    readingSubs.length > 0
      ? (readingSubs.reduce((acc, s) => acc + s.band, 0) / readingSubs.length).toFixed(1)
      : '—';

  const filteredSubmissions = allSubmissions.filter((s) => {
    if (selectedType === 'ALL') return true;
    return s.task?.type === selectedType;
  });

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {t('studentResults.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('studentResults.subtitle')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: t('studentResults.averageBand'),
            value: avgBand,
            icon: 'lucide:award',
            color: 'text-amber-500',
            bg: 'bg-amber-500/10 border-amber-500/20',
          },
          {
            label: t('studentResults.totalCompleted'),
            value: totalCompleted,
            icon: 'lucide:check-circle-2',
            color: 'text-primary',
            bg: 'bg-primary/10 border-primary/20',
          },
          {
            label: t('studentResults.listeningAvg'),
            value: listeningAvg,
            icon: 'lucide:headphones',
            color: 'text-purple-500',
            bg: 'bg-purple-500/10 border-purple-500/20',
          },
          {
            label: t('studentResults.readingAvg'),
            value: readingAvg,
            icon: 'lucide:book-open',
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${kpi.bg}`}>
              <Icon icon={kpi.icon} className={`h-6 w-6 ${kpi.color}`} />
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-foreground">
                {kpi.value}
              </div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        {(
          [
            { id: 'ALL', label: t('studentResults.filterAll'), count: allSubmissions.length },
            { id: 'LISTENING', label: t('studentResults.filterListening'), count: listeningSubs.length },
            { id: 'READING', label: t('studentResults.filterReading'), count: readingSubs.length },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedType(tab.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              selectedType === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                selectedType === tab.id
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted-foreground/10 text-muted-foreground'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Results Table */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40 font-semibold">
            <TableRow className="h-[44px]">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>{t('ielts.name')}</TableHead>
              <TableHead className="w-36">{t('tasks.questionType')}</TableHead>
              <TableHead className="w-32 text-center">{t('studentTasks.scoreHeader')}</TableHead>
              <TableHead className="w-32 text-center">IELTS Band</TableHead>
              <TableHead className="w-36 text-right">{t('ielts.date')}</TableHead>
              <TableHead className="w-28 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="h-[120px]">
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t('common.loading')}
                </TableCell>
              </TableRow>
            ) : filteredSubmissions.length > 0 ? (
              filteredSubmissions.map((sub, index) => (
                <TableRow key={sub.id} className="h-[52px]">
                  <TableCell className="w-12 text-center text-muted-foreground font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {sub.task?.title || 'IELTS Test'}
                  </TableCell>
                  <TableCell className="w-36">
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
                      {t('studentResults.review')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="h-[180px]">
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <Icon icon="lucide:award" className="mx-auto mb-2 h-10 w-10 opacity-30 text-primary" />
                  <div className="text-base font-semibold text-foreground">
                    {t('studentResults.noRecent')}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('studentResults.noRecentDesc')}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
