import { useState, Fragment } from 'react';
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
import { AttemptProgressChart } from './AttemptProgressChart';
import type { IeltsSubmission } from '@/features/ielts/api/ielts.api';

export function StudentResultsPage() {
  const { t } = useTranslation();
  const { data: submissions, isLoading } = useStudentMySubmissions();
  const [selectedType, setSelectedType] = useState<'ALL' | 'LISTENING' | 'READING'>('ALL');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState<{
    taskId: string;
    mode: 'take' | 'review';
  } | null>(null);

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

  // Group submissions by task
  const taskGroupsMap = new Map<
    string,
    {
      taskId: string;
      title: string;
      type: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
      attempts: IeltsSubmission[];
      bestBand: number;
      latestSubmission: IeltsSubmission;
    }
  >();

  allSubmissions.forEach((sub) => {
    const taskId = sub.taskId;
    const title = sub.task?.title || 'IELTS Test';
    const type = sub.task?.type || 'READING';
    const existing = taskGroupsMap.get(taskId);
    if (existing) {
      existing.attempts.push(sub);
      if (sub.band > existing.bestBand) existing.bestBand = sub.band;
      if (new Date(sub.submittedAt).getTime() > new Date(existing.latestSubmission.submittedAt).getTime()) {
        existing.latestSubmission = sub;
      }
    } else {
      taskGroupsMap.set(taskId, {
        taskId,
        title,
        type,
        attempts: [sub],
        bestBand: sub.band,
        latestSubmission: sub,
      });
    }
  });

  const taskGroups = Array.from(taskGroupsMap.values());
  const filteredTaskGroups = taskGroups.filter((g) => {
    if (selectedType === 'ALL') return true;
    return g.type === selectedType;
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
            { id: 'ALL', label: t('studentResults.filterAll'), count: taskGroups.length },
            {
              id: 'LISTENING',
              label: t('studentResults.filterListening'),
              count: taskGroups.filter((g) => g.type === 'LISTENING').length,
            },
            {
              id: 'READING',
              label: t('studentResults.filterReading'),
              count: taskGroups.filter((g) => g.type === 'READING').length,
            },
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

      {/* Results Table with Expandable Row History */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40 font-semibold">
            <TableRow className="h-[44px]">
              <TableHead className="w-10 text-center" />
              <TableHead>{t('ielts.name')}</TableHead>
              <TableHead className="w-32">{t('tasks.questionType')}</TableHead>
              <TableHead className="w-24 text-center">Urinishlar</TableHead>
              <TableHead className="w-32 text-center">Eng yaxshi Band</TableHead>
              <TableHead className="w-44 text-right">Oxirgi vaqt</TableHead>
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
            ) : filteredTaskGroups.length > 0 ? (
              filteredTaskGroups.map((group) => {
                const isExpanded = expandedTaskId === group.taskId;
                const isListening = group.type === 'LISTENING';
                return (
                  <Fragment key={group.taskId}>
                    <TableRow
                      className={`h-[56px] cursor-pointer transition-colors hover:bg-muted/30 ${
                        isExpanded ? 'bg-muted/20' : ''
                      }`}
                      onClick={() =>
                        setExpandedTaskId(isExpanded ? null : group.taskId)
                      }
                    >
                      <TableCell className="w-10 text-center text-muted-foreground">
                        <Icon
                          icon={
                            isExpanded
                              ? 'lucide:chevron-down'
                              : 'lucide:chevron-right'
                          }
                          className="h-4 w-4 transition-transform text-primary"
                        />
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{group.title}</span>
                          {group.attempts.length > 1 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-primary/30 text-primary font-bold"
                            >
                              +{group.attempts.length - 1} ta qayta yechilgan
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="w-32">
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
                          <span>
                            {isListening ? t('ielts.listening') : t('ielts.reading')}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="w-24 text-center text-xs font-bold text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-0.5 font-mono">
                          {group.attempts.length} ta
                        </span>
                      </TableCell>
                      <TableCell className="w-32 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-extrabold text-primary border border-primary/20">
                          <Icon icon="lucide:award" className="h-3 w-3" />
                          <span>Band {group.bestBand}</span>
                        </span>
                      </TableCell>
                      <TableCell className="w-44 text-right text-xs whitespace-nowrap">
                        <span className="font-semibold text-foreground">
                          {new Date(group.latestSubmission.submittedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="mx-1.5 text-muted-foreground/50">•</span>
                        <span className="text-muted-foreground">
                          {new Date(group.latestSubmission.submittedAt).toLocaleDateString([], {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      </TableCell>
                      <TableCell
                        className="w-28 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() =>
                            setViewerState({
                              taskId: group.taskId,
                              mode: 'take',
                            })
                          }
                          className="h-8 text-xs font-semibold gap-1"
                        >
                          <Icon icon="lucide:rotate-ccw" className="h-3.5 w-3.5" />
                          <span>{t('studentResults.retake')}</span>
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expandable sub-content */}
                    {isExpanded && (
                      <TableRow className="bg-muted/10 border-none hover:bg-muted/10">
                        <TableCell colSpan={7} className="p-4 sm:p-6">
                          <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
                            {/* Mini Chart */}
                            <AttemptProgressChart attempts={group.attempts} />

                            {/* Attempts Table */}
                            <div className="space-y-2">
                              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                {t('studentResults.attemptsHistory')} ({group.attempts.length})
                              </div>

                              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {group.attempts
                                  .slice()
                                  .sort(
                                    (a, b) => (b.attempt || 1) - (a.attempt || 1),
                                  )
                                  .map((att, idx) => (
                                    <div
                                      key={att.id}
                                      className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3 shadow-xs"
                                    >
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-xs text-foreground">
                                            #{att.attempt || group.attempts.length - idx}
                                          </span>
                                          <span className="text-[11px] font-semibold text-primary">
                                            Band {att.band}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                          <span>{att.score}/{att.total} ball</span>
                                          <span className="text-muted-foreground/40">•</span>
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

                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setViewerState({
                                            taskId: group.taskId,
                                            mode: 'review',
                                          })
                                        }
                                        className="h-7 text-xs text-primary"
                                      >
                                        {t('studentResults.review')}
                                      </Button>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
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

      {viewerState && (
        <IeltsTaskViewer
          taskId={viewerState.taskId}
          mode={viewerState.mode}
          onRetake={() =>
            setViewerState({ taskId: viewerState.taskId, mode: 'take' })
          }
          onClose={() => setViewerState(null)}
        />
      )}
    </div>
  );
}
