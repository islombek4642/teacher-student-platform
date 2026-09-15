import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAssignedTasks } from './api/student-tasks.api';

export function AssignedTasksPage() {
  const { t } = useTranslation();
  const { data: tasks } = useAssignedTasks();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t('studentTasks.title')}</h1>
      {tasks?.length === 0 && <p className="text-muted-foreground">{t('studentTasks.noTasks')}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tasks?.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle className="text-base">{task.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button size="sm" render={<Link to={`/student/tasks/${task.id}`} />}>
                {t('studentTasks.open')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
