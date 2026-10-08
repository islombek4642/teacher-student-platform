import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '@/auth/useAuth';
import { useSidebarKeyboard } from '@/hooks/useSidebarKeyboard';
import { ProfileSettingsDialog } from '@/features/profile/ProfileSettingsDialog';
import type { Role } from '@/api/types';

interface NavLinkConfig {
  to: string;
  labelKey: string;
  icon: string;
}

const NAV_LINKS_BY_ROLE: Record<Role, NavLinkConfig[]> = {
  SUPER_ADMIN: [{ to: '/super-admin/teachers', labelKey: 'teachers.title', icon: 'lucide:graduation-cap' }],
  TEACHER: [
    { to: '/teacher', labelKey: 'nav.home', icon: 'lucide:layout-dashboard' },
    { to: '/teacher/groups', labelKey: 'groups.title', icon: 'lucide:users' },
    { to: '/teacher/ielts/listening', labelKey: 'ielts.listening', icon: 'lucide:headphones' },
    { to: '/teacher/ielts/reading', labelKey: 'ielts.reading', icon: 'lucide:book-open' },
    { to: '/teacher/ielts/writing', labelKey: 'ielts.writing', icon: 'lucide:pen-tool' },
    { to: '/teacher/ielts/speaking', labelKey: 'ielts.speaking', icon: 'lucide:mic' },
  ],
  STUDENT: [
    { to: '/student', labelKey: 'nav.home', icon: 'lucide:layout-dashboard' },
    { to: '/student/results', labelKey: 'nav.results', icon: 'lucide:award' },
    { to: '/student/ielts/listening', labelKey: 'ielts.listening', icon: 'lucide:headphones' },
    { to: '/student/ielts/reading', labelKey: 'ielts.reading', icon: 'lucide:book-open' },
    { to: '/student/ielts/writing', labelKey: 'ielts.writing', icon: 'lucide:pen-tool' },
    { to: '/student/ielts/speaking', labelKey: 'ielts.speaking', icon: 'lucide:mic' },
  ],
};

const ROLE_CONFIG: Record<Role, { icon: string; labelKey: string; colorClass: string }> = {
  SUPER_ADMIN: {
    icon: 'lucide:shield-check',
    labelKey: 'roles.SUPER_ADMIN',
    colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  TEACHER: {
    icon: 'lucide:graduation-cap',
    labelKey: 'roles.TEACHER',
    colorClass: 'bg-primary/10 text-primary border-primary/20',
  },
  STUDENT: {
    icon: 'lucide:user',
    labelKey: 'roles.STUDENT',
    colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
};

export function AppLayout() {
  const { t } = useTranslation();
  const [profileOpen, setProfileOpen] = useState(false);
  const { username, fullName, payload, logout } = useAuth();
  const displayName = fullName || (username ?? payload?.sub);
  const firstName = payload?.firstName || (fullName ? fullName.split(' ')[0] : (username ?? payload?.sub));
  const location = useLocation();
  const navLinks = payload?.role ? NAV_LINKS_BY_ROLE[payload.role] : [];
  const roleConfig = payload?.role
    ? ROLE_CONFIG[payload.role]
    : {
        icon: 'lucide:user',
        labelKey: 'roles.STUDENT',
        colorClass: 'bg-muted text-muted-foreground border-border',
      };

  useSidebarKeyboard({ navLinks });

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
            <Icon icon="lucide:graduation-cap" className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">{t('app.title')}</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {navLinks.length > 0 && (
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navLinks.map((link) => {
                    const isHome = link.to === '/teacher' || link.to === '/student';
                    const isActive = isHome
                      ? location.pathname === link.to
                      : location.pathname.startsWith(link.to);
                    return (
                      <SidebarMenuItem key={link.to}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={t(link.labelKey)}
                          render={<Link to={link.to} />}
                        >
                        <Icon icon={link.icon} />
                        <span>{t(link.labelKey)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-between gap-2 px-1 group-data-[collapsible=icon]:flex-col">
            <div
              className="flex items-center gap-2.5 min-w-0"
              title={`${displayName ?? ''} (${t(roleConfig.labelKey)})`}
            >
              <Avatar
                size="sm"
                className={`shrink-0 border ${roleConfig.colorClass}`}
              >
                <AvatarFallback className="bg-transparent text-inherit">
                  <Icon icon={roleConfig.icon} className="size-3.5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold text-foreground leading-tight">
                  {firstName}
                </span>
                <span className="truncate text-[11px] text-muted-foreground leading-tight">
                  {t(roleConfig.labelKey)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setProfileOpen(true)}
                aria-label={t('profile.settingsTitle', { defaultValue: 'Sozlamalar' })}
                title={t('profile.settingsTitle', { defaultValue: 'Sozlamalar' })}
              >
                <Icon icon="lucide:settings" />
              </Button>
              <LanguageSwitcher />
              <Button variant="ghost" size="icon-sm" onClick={logout} aria-label={t('nav.logout')}>
                <Icon icon="lucide:log-out" />
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0 max-w-full overflow-x-hidden">
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <SidebarTrigger />
        </header>
        <main className="p-4 min-w-0 max-w-full">
          <Outlet />
        </main>
      </SidebarInset>

      {profileOpen && (
        <ProfileSettingsDialog open={profileOpen} onOpenChange={setProfileOpen} />
      )}
    </SidebarProvider>
  );
}
