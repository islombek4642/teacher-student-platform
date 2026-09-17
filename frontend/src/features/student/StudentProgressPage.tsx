import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreStamp } from '@/components/shared/ScoreStamp';
import { useStudentProgress } from './api/student-progress.api';

function StatCard({ label, value, stamp }: { label: string; value: string | number; stamp?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {stamp ? <ScoreStamp>{value}</ScoreStamp> : <span className="text-2xl font-semibold">{value}</span>}
      </CardContent>
    </Card>
  );
}

export function StudentProgressPage() {
  const { t } = useTranslation();
  const { data: progress, isLoading } = useStudentProgress();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('studentProgress.title')}</h1>
      {isLoading && <p className="text-muted-foreground">{t('studentProgress.loading')}</p>}
      {progress && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label={t('studentProgress.tasksCompleted')} value={progress.tasksCompleted} />
          <StatCard label={t('studentProgress.averageScore')} value={progress.averageScore.toFixed(1)} stamp />
          <StatCard
            label={t('studentProgress.lastActivity')}
            value={
              progress.lastActivityAt
                ? new Date(progress.lastActivityAt).toLocaleDateString()
                : t('studentProgress.never')
            }
          />
        </div>
      )}
    </div>
  );
}
