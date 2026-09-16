import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssignedTasks, useSubmitTask } from './api/student-tasks.api';
import { SubmissionResult } from './SubmissionResult';

function BackToList() {
  const { t } = useTranslation();
  return (
    <Link to="/student/tasks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <Icon icon="lucide:arrow-left" className="h-4 w-4" />
      {t('studentTasks.backToList')}
    </Link>
  );
}

export function TaskSubmissionPage() {
  const { t } = useTranslation();
  const { id: taskId } = useParams<{ id: string }>();
  const { data: tasks, isLoading } = useAssignedTasks();
  const task = tasks?.find((t) => t.id === taskId);
  const { mutate, data: submission, isPending } = useSubmitTask(taskId!);
  const { register, handleSubmit, setValue } = useForm<Record<string, string>>();

  if (isLoading) {
    return <p className="text-muted-foreground">{t('studentTasks.loading')}</p>;
  }

  if (!task) {
    return (
      <div className="space-y-4">
        <BackToList />
        <p className="text-muted-foreground">{t('studentTasks.notFound')}</p>
      </div>
    );
  }

  if (submission) {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-xl font-semibold">{task.title}</h1>
        <SubmissionResult submission={submission} />
        <Button variant="outline" render={<Link to="/student/tasks" />}>
          {t('studentTasks.backToList')}
        </Button>
      </div>
    );
  }

  // Already completed in an earlier session — show the saved score instead
  // of a blank form the student could fill out again and get rejected on
  // submit (the backend only allows one submission per task).
  if (task.mySubmission) {
    return (
      <div className="max-w-xl space-y-4">
        <BackToList />
        <h1 className="text-xl font-semibold">{task.title}</h1>
        <p className="text-lg font-semibold">
          {t('studentTasks.score', { score: task.mySubmission.score, total: task.questions.length })}
        </p>
      </div>
    );
  }

  const onSubmit = (values: Record<string, string>) =>
    mutate(task.questions.map((q) => ({ questionId: q.id, answer: values[q.id] ?? '' })));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <BackToList />
      <h1 className="text-xl font-semibold">{task.title}</h1>
      {task.questions.map((question, index) => (
        <div key={question.id} className="space-y-1">
          <Label htmlFor={question.id}>
            {index + 1}. {question.text}
          </Label>
          {question.type === 'MULTIPLE_CHOICE' ? (
            <Select<string> onValueChange={(value) => setValue(question.id, value ?? '')}>
              <SelectTrigger id={question.id} className="w-full">
                <SelectValue placeholder={t('studentTasks.yourAnswer')} />
              </SelectTrigger>
              <SelectContent>
                {question.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input id={question.id} {...register(question.id)} placeholder={t('studentTasks.yourAnswer')} />
          )}
        </div>
      ))}
      <Button type="submit" disabled={isPending}>
        {t('studentTasks.submit')}
      </Button>
    </form>
  );
}
