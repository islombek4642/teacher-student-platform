import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PasswordReveal } from '@/components/shared/PasswordReveal';
import { useCreateStudent } from './api/students.api';

const schema = z.object({
  username: z.string().min(3, 'required'),
  firstName: z.string().min(1, 'required'),
  lastName: z.string().min(1, 'required'),
});
type FormValues = z.infer<typeof schema>;

export function CreateStudentDialog({
  groupId,
  open,
  onOpenChange,
}: {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { mutate, isPending } = useCreateStudent(groupId);
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

  // Fix for the stale-password-notice bug found in Task 14's identical
  // CreateTeacherDialog pattern: without this, closing the dialog after a
  // successful create and reopening it would still show the old one-time
  // password instead of a fresh form.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setCreatedPassword(null);
      reset();
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('students.create')}</DialogTitle>
        </DialogHeader>
        {createdPassword ? (
          <div className="space-y-2">
            <p>{t('students.createdPasswordNotice')}</p>
            <PasswordReveal value={createdPassword} />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="username">{t('students.username')}</Label>
              <Input id="username" {...register('username')} />
              {errors.username && <p className="text-sm text-destructive">{t(errors.username.message!)}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="firstName">{t('students.firstName')}</Label>
              <Input id="firstName" {...register('firstName')} />
              {errors.firstName && <p className="text-sm text-destructive">{t(errors.firstName.message!)}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">{t('students.lastName')}</Label>
              <Input id="lastName" {...register('lastName')} />
              {errors.lastName && <p className="text-sm text-destructive">{t(errors.lastName.message!)}</p>}
            </div>
            <Button type="submit" disabled={isPending}>
              {t('students.create')}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
