import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGroups } from './api/groups.api';
import { useDeleteTask, useTasksForGroup } from './api/tasks.api';

export function TasksPage() {
  const { t } = useTranslation();
  const { data: groups } = useGroups();
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);
  const { data: tasks } = useTasksForGroup(selectedGroupId);
  const { mutate: remove } = useDeleteTask(selectedGroupId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('tasks.title')}</h1>
        <Button render={<Link to="/teacher/tasks/new" />}>{t('tasks.create')}</Button>
      </div>

      <Select<string> onValueChange={(value) => setSelectedGroupId(value ?? undefined)}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder={t('tasks.selectGroup')} />
        </SelectTrigger>
        <SelectContent>
          {groups?.map((group) => (
            <SelectItem key={group.id} value={group.id}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
                  render={<Link to={`/teacher/statistics?taskId=${task.id}`} />}
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
