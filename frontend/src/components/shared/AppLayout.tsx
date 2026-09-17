import { Link, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
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
import type { Role } from '@/api/types';

interface NavLinkConfig {
  to: string;
  labelKey: string;
  icon: string;
}

const NAV_LINKS_BY_ROLE: Record<Role, NavLinkConfig[]> = {
  SUPER_ADMIN: [{ to: '/super-admin/teachers', labelKey: 'teachers.title', icon: 'lucide:graduation-cap' }],
  TEACHER: [{ to: '/teacher/groups', labelKey: 'groups.title', icon: 'lucide:users' }],
  STUDENT: [
    { to: '/student/tasks', labelKey: 'studentTasks.title', icon: 'lucide:list-checks' },
    { to: '/student/progress', labelKey: 'studentProgress.title', icon: 'lucide:trending-up' },
  ],
};

export function AppLayout() {
  const { t } = useTranslation();
  const { username, payload, logout } = useAuth();
  const location = useLocation();
  const navLinks = payload?.role ? NAV_LINKS_BY_ROLE[payload.role] : [];

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
                  {navLinks.map((link) => (
                    <SidebarMenuItem key={link.to}>
                      <SidebarMenuButton
                        isActive={location.pathname.startsWith(link.to)}
                        tooltip={t(link.labelKey)}
                        render={<Link to={link.to} />}
                      >
                        <Icon icon={link.icon} />
                        <span>{t(link.labelKey)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center justify-between gap-2 px-1 group-data-[collapsible=icon]:flex-col">
            <span className="truncate text-sm text-muted-foreground group-data-[collapsible=icon]:hidden">
              {username ?? payload?.sub}
            </span>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <Button variant="ghost" size="icon-sm" onClick={logout} aria-label={t('nav.logout')}>
                <Icon icon="lucide:log-out" />
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <SidebarTrigger />
        </header>
        <main className="p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
