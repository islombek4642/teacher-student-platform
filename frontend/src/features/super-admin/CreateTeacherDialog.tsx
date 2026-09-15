import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCreateTeacher } from './api/teachers.api';

const schema = z.object({
  username: z.string().min(3, 'required'),
  firstName: z.string().min(1, 'required'),
  lastName: z.string().min(1, 'required'),
});
type FormValues = z.infer<typeof schema>;

export function CreateTeacherDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const { mutate, isPending } = useCreateTeacher();
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormValues) =>
    mutate(data, {
      onSuccess: (created) => {
        setCreatedPassword(created.temporaryPassword);
        reset();
      },
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('teachers.create')}</DialogTitle>
        </DialogHeader>
        {createdPassword ? (
          <p>{t('teachers.createdPasswordNotice', { password: createdPassword })}</p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="username">{t('teachers.username')}</Label>
              <Input id="username" {...register('username')} />
              {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="firstName">{t('teachers.firstName')}</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">{t('teachers.lastName')}</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName.message}</p>}
            </div>
            <Button type="submit" disabled={isPending}>
              {t('teachers.create')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
