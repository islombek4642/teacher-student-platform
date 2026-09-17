import type { ReactNode } from 'react';

export function ScoreStamp({ children, highlight }: { children: ReactNode; highlight?: boolean }) {
  return (
    <span
      className={`inline-flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full border-2 px-2 text-sm font-extrabold tabular-nums ${
        highlight ? 'border-gold bg-gold/10 text-gold' : 'border-primary bg-primary/5 text-primary'
      }`}
    >
      {children}
    </span>
  );
}
