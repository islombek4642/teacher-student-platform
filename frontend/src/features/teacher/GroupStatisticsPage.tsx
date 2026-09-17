import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { useGroupOverview, useLeaderboard, useTaskStats } from './api/statistics.api';

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
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId') ?? undefined;

  const { data: overview } = useGroupOverview(groupId);
  const { data: leaderboard } = useLeaderboard(groupId);
  const { data: taskStats } = useTaskStats(taskId);

  const leaderboardChartConfig = {
    score: { label: t('statistics.totalScore'), color: 'var(--primary)' },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      {taskId && taskStats && (
        <Card>
          <CardHeader>
            <CardTitle>{t('statistics.taskStatistics')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label={t('statistics.submissionCount')} value={taskStats.submissionCount} />
              <StatCard label={t('statistics.averageScore')} value={taskStats.averageScore.toFixed(1)} />
            </div>
            <div>
              <p className="text-sm font-medium">{t('statistics.mostMissed')}</p>
              {taskStats.mostMissedQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('statistics.noData')}</p>
              ) : (
                <ol className="ml-4 list-decimal text-sm">
                  {taskStats.mostMissedQuestions.map((question) => (
                    <li key={question.id}>
                      {question.text} {t('statistics.missedByCount', { count: question.missCount })}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
          </CardHeader>
          <CardContent>
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
                <Bar dataKey="score" fill="var(--color-score)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
