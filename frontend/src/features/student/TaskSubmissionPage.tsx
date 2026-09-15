import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAssignedTasks, useSubmitTask } from './api/student-tasks.api';
import { SubmissionResult } from './SubmissionResult';

export function TaskSubmissionPage() {
  const { t } = useTranslation();
  const { id: taskId } = useParams<{ id: string }>();
  const { data: tasks } = useAssignedTasks();
  const task = tasks?.find((t) => t.id === taskId);
  const { mutate, data: submission, isPending } = useSubmitTask(taskId!);
  const { register, handleSubmit } = useForm<Record<string, string>>();

  if (!task) return null;

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

  const onSubmit = (values: Record<string, string>) =>
    mutate(task.questions.map((q) => ({ questionId: q.id, answer: values[q.id] ?? '' })));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">{task.title}</h1>
      {task.questions.map((question, index) => (
        <div key={question.id} className="space-y-1">
          <Label htmlFor={question.id}>
            {index + 1}. {question.text}
          </Label>
          <Input id={question.id} {...register(question.id)} placeholder={t('studentTasks.yourAnswer')} />
        </div>
      ))}
      <Button type="submit" disabled={isPending}>
        {t('studentTasks.submit')}
      </Button>
    </form>
  );
}
