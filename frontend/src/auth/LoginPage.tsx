import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLogin } from './useLogin';

const loginSchema = z.object({
  username: z.string().min(1, 'required'),
  password: z.string().min(1, 'required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutate, isPending } = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginForm) => mutate(data, { onSuccess: () => navigate('/') });

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit(onSubmit)} className="w-80 space-y-4 rounded-lg border p-6">
        <h1 className="text-lg font-semibold">{t('auth.login.title')}</h1>
        <div className="space-y-1">
          <Label htmlFor="username">{t('auth.login.username')}</Label>
          <Input id="username" {...register('username')} />
          {errors.username && <p className="text-sm text-destructive">{t(errors.username.message!)}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">{t('auth.login.password')}</Label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password && <p className="text-sm text-destructive">{t(errors.password.message!)}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {t('auth.login.submit')}
        </Button>
      </form>
    </div>
  );
}
