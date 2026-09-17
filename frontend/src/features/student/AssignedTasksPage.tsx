import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAssignedTasks } from './api/student-tasks.api';

export function AssignedTasksPage() {
  const { t } = useTranslation();
  const { data: tasks, isLoading } = useAssignedTasks();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('studentTasks.title')}</h1>
      {isLoading && <p className="text-muted-foreground">{t('studentTasks.loading')}</p>}
      {tasks?.length === 0 && <p className="text-muted-foreground">{t('studentTasks.noTasks')}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tasks?.map((task) => (
          <Card key={task.id}>
            <CardHeader className="flex-row items-start justify-between gap-2">
              <CardTitle className="text-base">{task.title}</CardTitle>
              {task.mySubmission && (
                <Badge variant="secondary">
                  {t('studentTasks.completedScore', {
                    score: task.mySubmission.score,
                    total: task.questions.length,
                  })}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <Button size="sm" variant={task.mySubmission ? 'outline' : 'default'} render={<Link to={`/student/tasks/${task.id}`} />}>
                <Icon icon={task.mySubmission ? 'lucide:eye' : 'lucide:play'} />
                {task.mySubmission ? t('studentTasks.viewResult') : t('studentTasks.open')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
