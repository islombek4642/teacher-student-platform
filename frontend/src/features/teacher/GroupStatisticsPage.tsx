import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from 'recharts';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGroupOverview, useLeaderboard, useTasksStats } from './api/statistics.api';
import { useTasksForGroup } from './api/tasks.api';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

export function GroupStatisticsPage() {
  const { t } = useTranslation();
  const { id: groupId } = useParams<{ id: string }>();
  const [leaderboardView, setLeaderboardView] = useState<'chart' | 'table'>('chart');

  const { data: overview } = useGroupOverview(groupId);
  const { data: leaderboard } = useLeaderboard(groupId);
  const { data: tasks } = useTasksForGroup(groupId);
  const taskStatsResults = useTasksStats(tasks?.map((task) => task.id) ?? []);

  const leaderboardChartConfig = {
    score: { label: t('statistics.totalScore'), color: 'var(--primary)' },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      {overview && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label={t('statistics.studentCount')} value={overview.studentCount} />
          <StatCard label={t('statistics.averageScore')} value={overview.averageScore.toFixed(1)} />
          <StatCard label={t('statistics.tasksCompleted')} value={overview.tasksCompleted} />
        </div>
      )}

      {leaderboard && leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('statistics.leaderboard')}</CardTitle>
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLeaderboardView((v) => (v === 'chart' ? 'table' : 'chart'))}
              >
                <Icon icon={leaderboardView === 'chart' ? 'lucide:table' : 'lucide:bar-chart-3'} />
                {leaderboardView === 'chart' ? t('statistics.viewAsTable') : t('statistics.viewAsChart')}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {leaderboardView === 'chart' ? (
              <ChartContainer config={leaderboardChartConfig} className="h-[300px] w-full">
                <BarChart
                  data={leaderboard.map((entry) => ({
                    name: `${entry.firstName} ${entry.lastName}`,
                    score: entry.totalScore,
                  }))}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="score" fill="var(--color-score)" radius={[4, 4, 0, 0]} maxBarSize={24}>
                    <LabelList
                      dataKey="score"
                      position="top"
                      className="fill-foreground"
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>{t('statistics.studentName')}</TableHead>
                    <TableHead className="text-right">{t('statistics.totalScore')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry, index) => (
                    <TableRow key={entry.studentId}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        {entry.firstName} {entry.lastName}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{entry.totalScore}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t('statistics.taskStatistics')}</h2>
        {tasks?.length === 0 && <p className="text-sm text-muted-foreground">{t('tasks.empty')}</p>}
        {tasks?.map((task, index) => {
          const stats = taskStatsResults[index]?.data;
          return (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle className="text-base">{task.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <StatCard label={t('statistics.submissionCount')} value={stats.submissionCount} />
                      <StatCard label={t('statistics.averageScore')} value={stats.averageScore.toFixed(1)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('statistics.mostMissed')}</p>
                      {stats.mostMissedQuestions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('statistics.noData')}</p>
                      ) : (
                        <ol className="ml-4 list-decimal text-sm">
                          {stats.mostMissedQuestions.map((question) => (
                            <li key={question.id}>
                              {question.text} {t('statistics.missedByCount', { count: question.missCount })}
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('tasks.loading')}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
