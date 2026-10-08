import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { Icon } from '@iconify/react';
import { useGetMe, useChangePassword, useUpdateProfile } from './api/profile.api';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'profile.currentPasswordRequired'),
    newPassword: z.string().min(4, 'profile.passwordMinLength'),
    confirmPassword: z.string().min(1, 'profile.confirmPasswordRequired'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'profile.passwordMismatch',
    path: ['confirmPassword'],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const profileSchema = z.object({
  firstName: z.string().min(1, 'profile.firstNameRequired'),
  lastName: z.string().min(1, 'profile.lastNameRequired'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const { data: userProfile, isLoading: isProfileLoading } = useGetMe();
  const changePasswordMutation = useChangePassword();
  const updateProfileMutation = useUpdateProfile();

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfileForm,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      resetProfileForm({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
      });
    }
  }, [userProfile, resetProfileForm]);

  const onPasswordSubmit = (data: PasswordFormValues) => {
    changePasswordMutation.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          toast.add({
            type: 'success',
            description: t('profile.passwordChangedSuccess', {
              defaultValue: 'Parol muvaffaqiyatli o‘zgartirildi',
            }),
          });
          resetPasswordForm();
          onOpenChange(false);
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.message ||
            t('profile.passwordChangeError', {
              defaultValue: 'Parolni o‘zgartirishda xatolik yuz berdi',
            });
          toast.add({
            type: 'error',
            description: msg,
          });
        },
      },
    );
  };

  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(
      {
        firstName: data.firstName,
        lastName: data.lastName,
      },
      {
        onSuccess: () => {
          toast.add({
            type: 'success',
            description: t('profile.profileUpdatedSuccess', {
              defaultValue: 'Profil maʼlumotlari yangilandi',
            }),
          });
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.message ||
            t('profile.profileUpdateError', {
              defaultValue: 'Profilni yangilashda xatolik',
            });
          toast.add({
            type: 'error',
            description: msg,
          });
        },
      },
    );
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetPasswordForm();
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:user-cog" className="size-5 text-primary" />
            {t('profile.settingsTitle', { defaultValue: 'Profil sozlamalari' })}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'profile' | 'password')}
          className="w-full mt-2"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">
              <Icon icon="lucide:user" className="mr-2 size-4" />
              {t('profile.infoTab', { defaultValue: 'Profil' })}
            </TabsTrigger>
            <TabsTrigger value="password">
              <Icon icon="lucide:key-round" className="mr-2 size-4" />
              {t('profile.passwordTab', { defaultValue: 'Parol' })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 pt-3">
            {isProfileLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t('common.loading', { defaultValue: 'Yuklanmoqda...' })}
              </div>
            ) : (
              <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {t('profile.username', { defaultValue: 'Login' })}
                    </Label>
                    <Input
                      value={userProfile?.username || ''}
                      disabled
                      className="bg-muted text-muted-foreground"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {t('profile.role', { defaultValue: 'Rol' })}
                    </Label>
                    <Input
                      value={userProfile?.role || ''}
                      disabled
                      className="bg-muted text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="firstName">
                    {t('profile.firstName', { defaultValue: 'Ism' })}
                  </Label>
                  <Input
                    id="firstName"
                    {...registerProfile('firstName')}
                    placeholder={t('profile.firstNamePlaceholder', { defaultValue: 'Ismingiz' })}
                  />
                  {profileErrors.firstName && (
                    <p className="text-xs text-destructive">
                      {t(profileErrors.firstName.message!, {
                        defaultValue: 'Ism kiritilishi shart',
                      })}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="lastName">
                    {t('profile.lastName', { defaultValue: 'Familiya' })}
                  </Label>
                  <Input
                    id="lastName"
                    {...registerProfile('lastName')}
                    placeholder={t('profile.lastNamePlaceholder', { defaultValue: 'Familiyangiz' })}
                  />
                  {profileErrors.lastName && (
                    <p className="text-xs text-destructive">
                      {t(profileErrors.lastName.message!, {
                        defaultValue: 'Familiya kiritilishi shart',
                      })}
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="gap-2"
                  >
                    <Icon icon="lucide:save" className="size-4" />
                    {t('common.save', { defaultValue: 'Saqlash' })}
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>

          <TabsContent value="password" className="space-y-4 pt-3">
            <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="currentPassword">
                  {t('profile.currentPassword', { defaultValue: 'Joriy parol' })}
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...registerPassword('currentPassword')}
                  placeholder={t('profile.currentPasswordPlaceholder', { defaultValue: 'Eski parolni kiriting' })}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-xs text-destructive">
                    {t(passwordErrors.currentPassword.message!, {
                      defaultValue: 'Joriy parolni kiritish shart',
                    })}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="newPassword">
                  {t('profile.newPassword', { defaultValue: 'Yangi parol' })}
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...registerPassword('newPassword')}
                  placeholder={t('profile.newPasswordPlaceholder', { defaultValue: 'Kamida 4 ta belgi' })}
                />
                {passwordErrors.newPassword && (
                  <p className="text-xs text-destructive">
                    {t(passwordErrors.newPassword.message!, {
                      defaultValue: 'Yangi parol kamida 4 ta belgi bo‘lishi kerak',
                    })}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword">
                  {t('profile.confirmPassword', { defaultValue: 'Yangi parolni tasdiqlang' })}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...registerPassword('confirmPassword')}
                  placeholder={t('profile.confirmPasswordPlaceholder', { defaultValue: 'Yangi parolni qayta kiriting' })}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {t(passwordErrors.confirmPassword.message!, {
                      defaultValue: 'Parollar mos kelmadi',
                    })}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="gap-2"
                >
                  <Icon icon="lucide:shield-check" className="size-4" />
                  {t('profile.updatePassword', { defaultValue: 'Parolni yangilash' })}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
