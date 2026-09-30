import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import type { IeltsSubmission } from '@/features/ielts/api/ielts.api';

interface AttemptProgressChartProps {
  attempts: IeltsSubmission[];
}

export function AttemptProgressChart({ attempts }: AttemptProgressChartProps) {
  const { t } = useTranslation();
  if (!attempts || attempts.length === 0) return null;

  const sorted = [...attempts].sort((a, b) => (a.attempt || 1) - (b.attempt || 1));

  const chartData = sorted.map((att, idx) => ({
    name: t('studentResults.attemptNumber', {
      number: att.attempt || idx + 1,
      defaultValue: `${att.attempt || idx + 1}-urinish`,
    }),
    attempt: att.attempt || idx + 1,
    band: att.band,
    score: att.score,
    total: att.total,
    date: new Date(att.submittedAt).toLocaleDateString(),
  }));

  const firstBand = sorted[0].band;
  const latestBand = sorted[sorted.length - 1].band;
  const diff = Number((latestBand - firstBand).toFixed(1));

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:trending-up" className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t('studentResults.progressTrend')}
          </span>
        </div>

        {sorted.length > 1 && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
              diff > 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : diff < 0
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {diff > 0 ? (
              <>
                <Icon icon="lucide:arrow-up-right" className="h-3 w-3" />
                <span>{t('studentResults.bandGrowth', { diff })}</span>
              </>
            ) : diff < 0 ? (
              <>
                <Icon icon="lucide:arrow-down-right" className="h-3 w-3" />
                <span>{t('studentResults.bandDrop', { diff })}</span>
              </>
            ) : (
              <span>{t('studentResults.steadyScore')}</span>
            )}
          </span>
        )}
      </div>

      {sorted.length > 1 ? (
        <div className="h-[130px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 9]}
                ticks={[0, 3, 5, 6, 7, 8, 9]}
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-border/80 bg-popover px-3 py-2 text-xs shadow-md">
                        <div className="font-bold text-foreground">{data.name}</div>
                        <div className="text-primary font-black text-sm">
                          Band {data.band}
                        </div>
                        <div className="text-muted-foreground text-[11px]">
                          {t('studentResults.scoreLabel')}: {data.score}/{data.total} • {data.date}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="band"
                stroke="var(--primary)"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#bandGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Icon icon="lucide:info" className="h-4 w-4 shrink-0 text-primary" />
          <span>
            {t('studentResults.singleAttemptNotice')}
          </span>
        </div>
      )}
    </div>
  );
}
