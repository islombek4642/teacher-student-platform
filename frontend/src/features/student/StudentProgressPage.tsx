import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudentProgress } from './api/student-progress.api';

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

export function StudentProgressPage() {
  const { t } = useTranslation();
  const { data: progress } = useStudentProgress();

  if (!progress) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('studentProgress.title')}</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={t('studentProgress.tasksCompleted')} value={progress.tasksCompleted} />
        <StatCard label={t('studentProgress.averageScore')} value={progress.averageScore.toFixed(1)} />
        <StatCard
          label={t('studentProgress.lastActivity')}
          value={
            progress.lastActivityAt
              ? new Date(progress.lastActivityAt).toLocaleDateString()
              : t('studentProgress.never')
          }
        />
      </div>
    </div>
  );
}
