import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateGroup } from './api/groups.api';

const schema = z.object({ name: z.string().min(1, 'required') });
type FormValues = z.infer<typeof schema>;

export function CreateGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const { mutate, isPending } = useCreateGroup();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormValues) =>
    mutate(data.name, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });

  // Matches the pattern in CreateTeacherDialog/CreateStudentDialog: reset the
  // form on close so a cancelled draft doesn't linger for the next open.
  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('groups.create')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name">{t('groups.name')}</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{t(errors.name.message!)}</p>}
          </div>
          <Button type="submit" disabled={isPending}>
            {t('groups.create')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
