import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeleteTask, useTasksForGroup } from './api/tasks.api';

export function GroupTasksPage() {
  const { t } = useTranslation();
  const { id: groupId } = useParams<{ id: string }>();
  const { data: tasks, isLoading } = useTasksForGroup(groupId);
  const { mutate: remove } = useDeleteTask(groupId);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button render={<Link to={`/teacher/groups/${groupId}/tasks/new`} />}>{t('tasks.create')}</Button>
      </div>

      {isLoading && <p className="text-muted-foreground">{t('tasks.loading')}</p>}
      {!isLoading && tasks?.length === 0 && <p className="text-muted-foreground">{t('tasks.empty')}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tasks?.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <CardTitle className="text-base">{task.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{t('tasks.questionCount', { count: task.questions.length })}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link to={`/teacher/groups/${groupId}/statistics?taskId=${task.id}`} />}
                >
                  {t('tasks.statistics')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(t('tasks.confirmDelete'))) remove(task.id);
                  }}
                >
                  {t('tasks.delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
