import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { useAuth } from '@/auth/useAuth';
import { useIeltsTasks } from '@/features/ielts/api/ielts.api';
import { DashboardCard } from '@/components/shared/DashboardCard';

export function StudentDashboardPage() {
  const { t } = useTranslation();
  const { username } = useAuth();

  const { data: tasks } = useIeltsTasks();
  const listeningCount = tasks?.filter((tk) => tk.type === 'LISTENING').length;
  const readingCount = tasks?.filter((tk) => tk.type === 'READING').length;

  const statOrUndef = (count: number | undefined) =>
    count !== undefined && count > 0 ? t('dashboard.tasksCount', { count }) : undefined;

  return (
    <div className="space-y-8 pb-10">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-10 shadow-sm">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Icon icon="lucide:target" className="h-3.5 w-3.5" />
            <span>{t('dashboard.studentWelcome')}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {t('dashboard.studentGreeting', { name: username })}
          </h1>
          <p className="text-base text-muted-foreground">
            {t('dashboard.studentSubtitle')}
          </p>
        </div>
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />
      </div>

      {/* Stat summary row */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: t('ielts.listening'), value: listeningCount ?? '—', icon: 'lucide:headphones' },
          { label: t('ielts.reading'), value: readingCount ?? '—', icon: 'lucide:book-open' },
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
      <div className="grid gap-5 sm:grid-cols-2">
        <DashboardCard
          to="/student/ielts/listening"
          title={t('ielts.listening')}
          description={t('dashboard.listeningDesc')}
          icon="lucide:headphones"
          stat={statOrUndef(listeningCount)}
          colorScheme="purple"
          ctaLabel={t('dashboard.start')}
        />
        <DashboardCard
          to="/student/ielts/reading"
          title={t('ielts.reading')}
          description={t('dashboard.readingDesc')}
          icon="lucide:book-open"
          stat={statOrUndef(readingCount)}
          colorScheme="emerald"
          ctaLabel={t('dashboard.start')}
        />
        <DashboardCard
          to="/student/ielts/writing"
          title={t('ielts.writing')}
          description={t('dashboard.writingDesc')}
          icon="lucide:pen-tool"
          badge={t('dashboard.comingSoon')}
          colorScheme="amber"
          disabled
          ctaLabel={t('dashboard.comingSoon')}
        />
        <DashboardCard
          to="/student/ielts/speaking"
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
