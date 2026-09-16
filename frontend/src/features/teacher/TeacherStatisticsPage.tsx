import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGroups } from './api/groups.api';
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

export function TeacherStatisticsPage() {
  const { t } = useTranslation();
  const { data: groups } = useGroups();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = searchParams.get('taskId') ?? undefined;
  const selectedGroupId = searchParams.get('groupId') ?? undefined;

  const selectGroup = (groupId: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (groupId) next.set('groupId', groupId);
    else next.delete('groupId');
    setSearchParams(next, { replace: true });
  };

  const { data: overview } = useGroupOverview(selectedGroupId);
  const { data: leaderboard } = useLeaderboard(selectedGroupId);
  const { data: taskStats } = useTaskStats(taskId);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t('statistics.title')}</h1>

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

      <Select<string> defaultValue={selectedGroupId} onValueChange={(value) => selectGroup(value ?? undefined)}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder={t('statistics.selectGroup')}>
            {(value: string | null) =>
              groups?.find((group) => group.id === value)?.name ?? t('statistics.selectGroup')
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {groups?.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
          <CardContent style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={leaderboard.map((entry) => ({
                  name: `${entry.firstName} ${entry.lastName}`,
                  score: entry.totalScore,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="score" name={t('statistics.totalScore')} fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
