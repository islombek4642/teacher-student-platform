import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { useCreateTask } from './api/tasks.api';
import { taskFormSchema, type TaskFormValues } from './task-form-schema';

// Each question is its own component so it can call `useWatch` for its own
// `type`/`options` fields. Reading those via the plain `watch()` accessor
// directly inside a `fields.map(...)` loop in the parent does NOT reliably
// re-render on `setValue` in this react-hook-form version, which silently
// broke the type-switch UI (empirically verified). `useWatch` is the
// documented react-hook-form pattern for isolating re-renders per
// `useFieldArray` item, and it fixes that bug.
function QuestionRow({
  control,
  register,
  setValue,
  errors,
  index,
  onRemove,
}: {
  control: Control<TaskFormValues>;
  register: UseFormRegister<TaskFormValues>;
  setValue: UseFormSetValue<TaskFormValues>;
  errors: FieldErrors<TaskFormValues>;
  index: number;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const type = useWatch({ control, name: `questions.${index}.type` });
  const options = useWatch({ control, name: `questions.${index}.options` as `questions.${number}.options` }) as
    | string[]
    | undefined;
  const questionErrors = errors.questions?.[index];

  return (
    <div className="space-y-2 rounded border p-3">
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
            <SelectValue placeholder={t('tasks.questionType')}>
              {(value: 'FILL_BLANK' | 'MULTIPLE_CHOICE' | null) =>
                value === 'MULTIPLE_CHOICE'
                  ? t('tasks.multipleChoice')
                  : value === 'FILL_BLANK'
                    ? t('tasks.fillBlank')
                    : t('tasks.questionType')
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FILL_BLANK">{t('tasks.fillBlank')}</SelectItem>
            <SelectItem value="MULTIPLE_CHOICE">{t('tasks.multipleChoice')}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Icon icon="lucide:trash-2" />
          {t('tasks.delete')}
        </Button>
      </div>

      <Input placeholder={t('tasks.questionText')} {...register(`questions.${index}.text`)} />
      {questionErrors?.text && <p className="text-sm text-destructive">{t(questionErrors.text.message!)}</p>}

      {type === 'MULTIPLE_CHOICE' ? (
        <>
          {(options ?? []).map((_, optionIndex) => (
            <div key={optionIndex} className="flex gap-2">
              <Input
                placeholder={`${t('tasks.options')} ${optionIndex + 1}`}
                {...register(`questions.${index}.options.${optionIndex}`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const current = options ?? [];
                  setValue(
                    `questions.${index}.options`,
                    current.filter((_, i) => i !== optionIndex),
                  );
                }}
              >
                <Icon icon="lucide:trash-2" />
                {t('tasks.delete')}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const current = options ?? [];
              setValue(`questions.${index}.options`, [...current, '']);
            }}
          >
            <Icon icon="lucide:plus" />
            {t('tasks.addOption')}
          </Button>
          {(() => {
            const optionsError = (questionErrors as { options?: unknown } | undefined)?.options as
              | { message?: string }
              | { message?: string }[]
              | undefined;
            const message = Array.isArray(optionsError)
              ? optionsError.find((e) => e?.message)?.message
              : optionsError?.message;
            return message ? <p className="text-sm text-destructive">{t(message)}</p> : null;
          })()}
        </>
      ) : null}

      <Input placeholder={t('tasks.correctAnswer')} {...register(`questions.${index}.correctAnswer`)} />
      {questionErrors?.correctAnswer && (
        <p className="text-sm text-destructive">{t(questionErrors.correctAnswer.message!)}</p>
      )}
    </div>
  );
}

export function NewTaskPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: groupId } = useParams<{ id: string }>();
  const { mutate, isPending } = useCreateTask();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { groupId: groupId!, title: '', description: '', questions: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  const onSubmit = (data: TaskFormValues) =>
    mutate(data, {
      onSuccess: () => {
        toast.add({ type: 'success', description: t('tasks.createSuccess') });
        navigate(`/teacher/groups/${groupId}/tasks`);
      },
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">{t('tasks.create')}</h1>

      <div className="space-y-1">
        <Label htmlFor="title">{t('tasks.taskTitle')}</Label>
        <Input id="title" {...register('title')} />
        {errors.title && <p className="text-sm text-destructive">{t(errors.title.message!)}</p>}
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
            <Icon icon="lucide:plus" />
            {t('tasks.addQuestion')}
          </Button>
        </div>
        {errors.questions?.message && <p className="text-sm text-destructive">{t(errors.questions.message)}</p>}

        {fields.map((field, index) => (
          <QuestionRow
            key={field.id}
            control={control}
            register={register}
            setValue={setValue}
            errors={errors}
            index={index}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      <Button type="submit" disabled={isPending}>
        {t('tasks.create')}
      </Button>
    </form>
  );
}
