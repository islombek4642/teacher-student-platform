import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '@/auth/useAuth';
import type { Role } from '@/api/types';

interface NavLinkConfig {
  to: string;
  labelKey: string;
}

const NAV_LINKS_BY_ROLE: Record<Role, NavLinkConfig[]> = {
  SUPER_ADMIN: [],
  TEACHER: [
    { to: '/teacher/groups', labelKey: 'groups.title' },
    { to: '/teacher/tasks', labelKey: 'tasks.title' },
    { to: '/teacher/statistics', labelKey: 'statistics.title' },
  ],
  STUDENT: [
    { to: '/student/tasks', labelKey: 'studentTasks.title' },
    { to: '/student/progress', labelKey: 'studentProgress.title' },
  ],
};

export function AppLayout() {
  const { t } = useTranslation();
  const { username, payload, logout } = useAuth();
  const navLinks = payload?.role ? NAV_LINKS_BY_ROLE[payload.role] : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">{t('app.title')}</span>
          {navLinks.length > 0 && (
            <nav className="flex items-center gap-4">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    isActive
                      ? 'text-sm font-semibold text-foreground'
                      : 'text-sm text-muted-foreground hover:text-foreground'
                  }
                >
                  {t(link.labelKey)}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{username ?? payload?.sub}</span>
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
