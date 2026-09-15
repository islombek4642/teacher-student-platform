import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGroups } from './api/groups.api';
import { useCreateTask } from './api/tasks.api';
import { taskFormSchema, type TaskFormValues } from './task-form-schema';

export function NewTaskPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: groups } = useGroups();
  const { mutate, isPending } = useCreateTask();
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { groupId: '', title: '', description: '', questions: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  const onSubmit = (data: TaskFormValues) =>
    mutate(data, { onSuccess: () => navigate('/teacher/tasks') });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">{t('tasks.create')}</h1>

      <div className="space-y-1">
        <Label htmlFor="groupId">{t('tasks.selectGroup')}</Label>
        <Select<string> onValueChange={(value) => setValue('groupId', value ?? '')}>
          <SelectTrigger id="groupId">
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
        {errors.groupId && <p className="text-sm text-destructive">{errors.groupId.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="title">{t('tasks.taskTitle')}</Label>
        <Input id="title" {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">{t('tasks.description')}</Label>
        <Input id="description" {...register('description')} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t('tasks.questions')}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ type: 'FILL_BLANK', text: '', correctAnswer: '' })}
          >
            {t('tasks.addQuestion')}
          </Button>
        </div>
        {errors.questions?.message && <p className="text-sm text-destructive">{t(errors.questions.message)}</p>}

        {fields.map((field, index) => {
          const type = watch(`questions.${index}.type`);
          return (
            <div key={field.id} className="space-y-2 rounded border p-3">
              <div className="flex items-center justify-between">
                <Select<'FILL_BLANK' | 'MULTIPLE_CHOICE'>
                  defaultValue={type}
                  onValueChange={(value) =>
                    setValue(
                      `questions.${index}`,
                      value === 'MULTIPLE_CHOICE'
                        ? { type: 'MULTIPLE_CHOICE', text: '', options: ['', ''], correctAnswer: '' }
                        : { type: 'FILL_BLANK', text: '', correctAnswer: '' },
                    )
                  }
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder={t('tasks.questionType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FILL_BLANK">{t('tasks.fillBlank')}</SelectItem>
                    <SelectItem value="MULTIPLE_CHOICE">{t('tasks.multipleChoice')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                  {t('tasks.delete')}
                </Button>
              </div>

              <Input placeholder={t('tasks.questionText')} {...register(`questions.${index}.text`)} />

              {type === 'MULTIPLE_CHOICE' ? (
                <>
                  {(watch(`questions.${index}.options`) ?? []).map((_, optionIndex) => (
                    <Input
                      key={optionIndex}
                      placeholder={`${t('tasks.options')} ${optionIndex + 1}`}
                      {...register(`questions.${index}.options.${optionIndex}`)}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const current = watch(`questions.${index}.options`) ?? [];
                      setValue(`questions.${index}.options`, [...current, '']);
                    }}
                  >
                    {t('tasks.addOption')}
                  </Button>
                </>
              ) : null}

              <Input placeholder={t('tasks.correctAnswer')} {...register(`questions.${index}.correctAnswer`)} />
            </div>
          );
        })}
      </div>

      <Button type="submit" disabled={isPending}>
        {t('tasks.create')}
      </Button>
    </form>
  );
}
