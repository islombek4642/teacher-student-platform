import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '@/auth/useAuth';

export function AppLayout() {
  const { t } = useTranslation();
  const { username, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <span className="font-semibold">{t('app.title')}</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{username}</span>
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" onClick={logout}>
            <Icon icon="lucide:log-out" className="mr-2 h-4 w-4" />
            {t('nav.logout')}
          </Button>
        </div>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
