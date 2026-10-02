import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { useAuth } from '@/auth/useAuth';
import { useGroups } from './api/groups.api';
import { useIeltsTasks } from '@/features/ielts/api/ielts.api';
import { DashboardCard } from '@/components/shared/DashboardCard';

export function TeacherDashboardPage() {
  const { t } = useTranslation();
  const { username } = useAuth();

  const { data: groupsData } = useGroups(1);
  const totalGroups = groupsData?.meta?.total;

  const { data: tasks } = useIeltsTasks();
  const listeningCount = tasks?.filter((tk) => tk.type === 'LISTENING').length;
  const readingCount = tasks?.filter((tk) => tk.type === 'READING').length;
  const writingCount = tasks?.filter((tk) => tk.type === 'WRITING').length;

  const statOrUndef = (count: number | undefined) =>
    count !== undefined && count > 0 ? t('dashboard.tasksCount', { count }) : undefined;

  return (
    <div className="space-y-8 pb-10">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-10 shadow-sm">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Icon icon="lucide:sparkles" className="h-3.5 w-3.5" />
            <span>{t('dashboard.teacherWelcome')}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {t('dashboard.teacherGreeting', { name: username })}
          </h1>
          <p className="text-base text-muted-foreground">
            {t('dashboard.teacherSubtitle')}
          </p>
        </div>
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />
      </div>

      {/* Stat summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t('groups.title'), value: totalGroups ?? '—', icon: 'lucide:users' },
          { label: t('ielts.listening'), value: listeningCount ?? '—', icon: 'lucide:headphones' },
          { label: t('ielts.reading'), value: readingCount ?? '—', icon: 'lucide:book-open' },
          { label: t('ielts.writing'), value: writingCount ?? '—', icon: 'lucide:pen-tool' },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border/60 bg-card px-4 py-5 text-center shadow-sm"
          >
            <Icon icon={item.icon} className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {item.value}
            </span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Navigation cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          to="/teacher/groups"
          title={t('groups.title')}
          description={t('dashboard.groupsDesc')}
          icon="lucide:users"
          stat={
            totalGroups !== undefined && totalGroups > 0
              ? t('dashboard.groupsCount', { count: totalGroups })
              : undefined
          }
          colorScheme="indigo"
          ctaLabel={t('dashboard.goIn')}
        />
        <DashboardCard
          to="/teacher/ielts/listening"
          title={t('ielts.listening')}
          description={t('dashboard.listeningDesc')}
          icon="lucide:headphones"
          stat={statOrUndef(listeningCount)}
          colorScheme="purple"
          ctaLabel={t('dashboard.goIn')}
        />
        <DashboardCard
          to="/teacher/ielts/reading"
          title={t('ielts.reading')}
          description={t('dashboard.readingDesc')}
          icon="lucide:book-open"
          stat={statOrUndef(readingCount)}
          colorScheme="emerald"
          ctaLabel={t('dashboard.goIn')}
        />
        <DashboardCard
          to="/teacher/ielts/writing"
          title={t('ielts.writing')}
          description={t('dashboard.writingDesc')}
          icon="lucide:pen-tool"
          stat={statOrUndef(writingCount)}
          colorScheme="amber"
          ctaLabel={t('dashboard.goIn')}
        />
        <DashboardCard
          to="/teacher/ielts/speaking"
          title={t('ielts.speaking')}
          description={t('dashboard.speakingDesc')}
          icon="lucide:mic"
          badge={t('dashboard.comingSoon')}
          colorScheme="rose"
          disabled
          ctaLabel={t('dashboard.comingSoon')}
        />
      </div>
    </div>
  );
}
