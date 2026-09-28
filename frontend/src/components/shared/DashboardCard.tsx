import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';

interface DashboardCardProps {
  to: string;
  title: string;
  description: string;
  icon: string;
  stat?: string;
  badge?: string;
  colorScheme: 'indigo' | 'purple' | 'emerald' | 'amber' | 'rose' | 'blue';
  disabled?: boolean;
  ctaLabel: string;
}

const COLOR_STYLES = {
  indigo: {
    gradient: 'bg-gradient-to-br from-indigo-500/[0.08] to-transparent',
    hover: 'hover:border-indigo-400/50 hover:shadow-indigo-500/10',
    iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white',
    pill: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    cta: 'text-indigo-600 dark:text-indigo-400',
  },
  purple: {
    gradient: 'bg-gradient-to-br from-purple-500/[0.08] to-transparent',
    hover: 'hover:border-purple-400/50 hover:shadow-purple-500/10',
    iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white',
    pill: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    cta: 'text-purple-600 dark:text-purple-400',
  },
  emerald: {
    gradient: 'bg-gradient-to-br from-emerald-500/[0.08] to-transparent',
    hover: 'hover:border-emerald-400/50 hover:shadow-emerald-500/10',
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
    pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    cta: 'text-emerald-600 dark:text-emerald-400',
  },
  amber: {
    gradient: 'bg-gradient-to-br from-amber-500/[0.08] to-transparent',
    hover: 'hover:border-amber-400/50 hover:shadow-amber-500/10',
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white',
    pill: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    cta: 'text-amber-600 dark:text-amber-400',
  },
  rose: {
    gradient: 'bg-gradient-to-br from-rose-500/[0.08] to-transparent',
    hover: 'hover:border-rose-400/50 hover:shadow-rose-500/10',
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white',
    pill: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    cta: 'text-rose-600 dark:text-rose-400',
  },
  blue: {
    gradient: 'bg-gradient-to-br from-blue-500/[0.08] to-transparent',
    hover: 'hover:border-blue-400/50 hover:shadow-blue-500/10',
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white',
    pill: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    cta: 'text-blue-600 dark:text-blue-400',
  },
} as const;

export function DashboardCard({
  to,
  title,
  description,
  icon,
  stat,
  badge,
  colorScheme,
  disabled = false,
  ctaLabel,
}: DashboardCardProps) {
  const s = COLOR_STYLES[colorScheme];
  const pill = badge ?? stat;

  const card = (
    <div
      className={[
        'group relative flex h-full flex-col justify-between overflow-hidden',
        'rounded-2xl border border-border/60 bg-card p-6',
        'transition-all duration-300',
        s.gradient,
        disabled
          ? 'cursor-not-allowed opacity-60'
          : `cursor-pointer hover:-translate-y-0.5 hover:shadow-lg ${s.hover}`,
      ].join(' ')}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div
            className={[
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              'transition-all duration-300',
              s.iconBg,
            ].join(' ')}
          >
            <Icon
              icon={icon}
              className="h-5 w-5 transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          {pill && (
            <span
              className={[
                'mt-0.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                s.pill,
              ].join(' ')}
            >
              {pill}
            </span>
          )}
        </div>

        <h3 className="mt-4 text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div
        className={[
          'mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs font-semibold',
          s.cta,
        ].join(' ')}
      >
        <span>{disabled ? (badge ?? '') : ctaLabel}</span>
        {!disabled && (
          <Icon
            icon="lucide:arrow-right"
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
          />
        )}
      </div>
    </div>
  );

  if (disabled) return card;
  return (
    <Link
      to={to}
      className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
    >
      {card}
    </Link>
  );
}
