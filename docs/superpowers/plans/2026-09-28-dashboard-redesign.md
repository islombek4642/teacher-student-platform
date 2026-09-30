# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected Teacher and Student dashboard pages with premium-quality, statistically-rich home pages containing a hero banner, a stat summary row, and navigational DashboardCards.

**Architecture:** A shared `DashboardCard` component lives in `src/components/shared/DashboardCard.tsx`. Both role dashboards import it. Each dashboard fetches its own real stats via existing React Query hooks and passes them as props.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, `@iconify/react`, React Query (existing), i18next (existing)

**Spec:** Self-contained plan; no separate spec file.

## Global Constraints

- All UI text via `t()` — no hardcoded strings
- Icon library: `@iconify/react` `Icon` only
- Tailwind dark-mode classes required (`dark:`)
- Follow existing file conventions — no new routes, no new API hooks, no new libs

## Review Focus

- Empty/loading stats must show `—` not `0`
- Stat badge hidden when count is 0
- Disabled cards must not render a `<Link>` — cursor-not-allowed
- Both `uz.json` and `en.json` must have ALL new keys
- 2-col grid on `sm` must not cause horizontal scroll

---

## Task 1: Shared DashboardCard component

**Files:**
- Create: `frontend/src/components/shared/DashboardCard.tsx`

**Interfaces:**
- Produces: `DashboardCard` with props `{ to, title, description, icon, stat?, badge?, colorScheme, disabled?, ctaLabel }`

- [ ] **Step 1: Create `DashboardCard.tsx`**

```tsx
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
  to, title, description, icon, stat, badge, colorScheme, disabled = false, ctaLabel,
}: DashboardCardProps) {
  const s = COLOR_STYLES[colorScheme];
  const pill = badge ?? stat;

  const card = (
    <div className={[
      'group relative flex h-full flex-col justify-between overflow-hidden',
      'rounded-2xl border border-border/60 bg-card p-6',
      'transition-all duration-300',
      s.gradient,
      disabled
        ? 'cursor-not-allowed opacity-60'
        : `cursor-pointer hover:-translate-y-0.5 hover:shadow-lg ${s.hover}`,
    ].join(' ')}>
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className={['flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300', s.iconBg].join(' ')}>
            <Icon icon={icon} className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
          </div>
          {pill && (
            <span className={['mt-0.5 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', s.pill].join(' ')}>
              {pill}
            </span>
          )}
        </div>
        <h3 className="mt-4 text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className={['mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs font-semibold', s.cta].join(' ')}>
        <span>{disabled ? (badge ?? '') : ctaLabel}</span>
        {!disabled && (
          <Icon icon="lucide:arrow-right" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        )}
      </div>
    </div>
  );

  if (disabled) return card;
  return (
    <Link to={to} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl">
      {card}
    </Link>
  );
}
```

- [ ] **Step 2: Verify TS compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: 0 new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared/DashboardCard.tsx
git commit -m "feat: add shared DashboardCard component"
```

---

## Task 2: Translation keys

**Files:**
- Modify: `frontend/src/locales/uz.json`
- Modify: `frontend/src/locales/en.json`

**Interfaces:**
- Produces: `dashboard.*` and `nav.home` keys consumed by Tasks 3 & 4

- [ ] **Step 1: Check nav.home existence**

Run: `node -e "const uz=require('./frontend/src/locales/uz.json'); console.log(JSON.stringify(uz.nav))"`
Expected output includes `"home"` key; if missing, add it

- [ ] **Step 2: Add/update keys in uz.json**

Inside `"nav"` object add: `"home": "Asosiy sahifa"`

After `"ielts"` block add new `"dashboard"` object:
```json
"dashboard": {
  "teacherWelcome": "O'qituvchi boshqaruv paneli",
  "teacherGreeting": "Salom, {{name}}! 👋",
  "teacherSubtitle": "O'quvchilaringiz va topshiriqlarni boshqaring.",
  "studentWelcome": "IELTS Mashg'ulot maydoni",
  "studentGreeting": "Salom, {{name}}! 🎯",
  "studentSubtitle": "Bugun qaysi bo'limda mashq qilasiz?",
  "groupsDesc": "Guruhlarni yarating, o'quvchilarni boshqaring.",
  "listeningDesc": "Listening testlarini yuklang va boshqaring.",
  "readingDesc": "Reading testlarini yuklang va boshqaring.",
  "writingDesc": "Writing topshiriqlarini boshqaring.",
  "speakingDesc": "Speaking topshiriqlarini boshqaring.",
  "groupsCount_one": "{{count}} ta guruh",
  "groupsCount_other": "{{count}} ta guruh",
  "tasksCount_one": "{{count}} ta test",
  "tasksCount_other": "{{count}} ta test",
  "comingSoon": "Tez kunda",
  "goIn": "Kirish",
  "start": "Boshlash"
}
```

- [ ] **Step 3: Add/update keys in en.json**

Inside `"nav"` add: `"home": "Home"`

After `"ielts"` block add:
```json
"dashboard": {
  "teacherWelcome": "Teacher Dashboard",
  "teacherGreeting": "Hello, {{name}}! 👋",
  "teacherSubtitle": "Manage your students and assignments.",
  "studentWelcome": "IELTS Practice Zone",
  "studentGreeting": "Hello, {{name}}! 🎯",
  "studentSubtitle": "Which section will you practise today?",
  "groupsDesc": "Create groups and manage your students.",
  "listeningDesc": "Upload and manage listening tests.",
  "readingDesc": "Upload and manage reading tests.",
  "writingDesc": "Manage writing tasks.",
  "speakingDesc": "Manage speaking tasks.",
  "groupsCount_one": "{{count}} group",
  "groupsCount_other": "{{count}} groups",
  "tasksCount_one": "{{count}} test",
  "tasksCount_other": "{{count}} tests",
  "comingSoon": "Coming soon",
  "goIn": "Go in",
  "start": "Start"
}
```

- [ ] **Step 4: Validate JSON**

Run: `node -e "require('./frontend/src/locales/uz.json'); require('./frontend/src/locales/en.json'); console.log('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/locales/uz.json frontend/src/locales/en.json
git commit -m "i18n: add dashboard + nav.home translation keys"
```

---

## Task 3: Rewrite TeacherDashboardPage

**Files:**
- Modify: `frontend/src/features/teacher/TeacherDashboardPage.tsx`

**Interfaces:**
- Consumes: `DashboardCard` from Task 1
- Consumes: `dashboard.*` keys from Task 2
- Consumes: `useGroups(page)` → `{ data: { meta: { total: number } } }`
- Consumes: `useIeltsTasks()` → `IeltsTask[]` with `.type: 'LISTENING' | 'READING' | ...`
- Produces: exported `TeacherDashboardPage`

- [ ] **Step 1: Overwrite file**

```tsx
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

  const statOrUndef = (count: number | undefined) =>
    count !== undefined && count > 0 ? t('dashboard.tasksCount', { count }) : undefined;

  return (
    <div className="space-y-8 pb-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-10 shadow-sm">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Icon icon="lucide:sparkles" className="h-3.5 w-3.5" />
            <span>{t('dashboard.teacherWelcome')}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {t('dashboard.teacherGreeting', { name: username })}
          </h1>
          <p className="text-base text-muted-foreground">{t('dashboard.teacherSubtitle')}</p>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('groups.title'), value: totalGroups ?? '—', icon: 'lucide:users' },
          { label: t('ielts.listening'), value: listeningCount ?? '—', icon: 'lucide:headphones' },
          { label: t('ielts.reading'), value: readingCount ?? '—', icon: 'lucide:book-open' },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border/60 bg-card px-4 py-5 text-center shadow-sm">
            <Icon icon={item.icon} className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold tracking-tight text-foreground">{item.value}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard to="/teacher/groups" title={t('groups.title')} description={t('dashboard.groupsDesc')} icon="lucide:users"
          stat={totalGroups !== undefined && totalGroups > 0 ? t('dashboard.groupsCount', { count: totalGroups }) : undefined}
          colorScheme="indigo" ctaLabel={t('dashboard.goIn')} />
        <DashboardCard to="/teacher/ielts/listening" title={t('ielts.listening')} description={t('dashboard.listeningDesc')} icon="lucide:headphones"
          stat={statOrUndef(listeningCount)} colorScheme="purple" ctaLabel={t('dashboard.goIn')} />
        <DashboardCard to="/teacher/ielts/reading" title={t('ielts.reading')} description={t('dashboard.readingDesc')} icon="lucide:book-open"
          stat={statOrUndef(readingCount)} colorScheme="emerald" ctaLabel={t('dashboard.goIn')} />
        <DashboardCard to="/teacher/ielts/writing" title={t('ielts.writing')} description={t('dashboard.writingDesc')} icon="lucide:pen-tool"
          badge={t('dashboard.comingSoon')} colorScheme="amber" disabled ctaLabel={t('dashboard.comingSoon')} />
        <DashboardCard to="/teacher/ielts/speaking" title={t('ielts.speaking')} description={t('dashboard.speakingDesc')} icon="lucide:mic"
          badge={t('dashboard.comingSoon')} colorScheme="rose" disabled ctaLabel={t('dashboard.comingSoon')} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TS**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: 0 new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/teacher/TeacherDashboardPage.tsx
git commit -m "feat: rewrite TeacherDashboardPage — hero + stats + cards"
```

---

## Task 4: Rewrite StudentDashboardPage

**Files:**
- Modify: `frontend/src/features/student/StudentDashboardPage.tsx`

**Interfaces:**
- Consumes: `DashboardCard` from Task 1
- Consumes: `dashboard.*` keys from Task 2
- Consumes: `useIeltsTasks()` → `IeltsTask[]`
- Produces: exported `StudentDashboardPage`

- [ ] **Step 1: Overwrite file**

```tsx
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
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 md:p-10 shadow-sm">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Icon icon="lucide:target" className="h-3.5 w-3.5" />
            <span>{t('dashboard.studentWelcome')}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {t('dashboard.studentGreeting', { name: username })}
          </h1>
          <p className="text-base text-muted-foreground">{t('dashboard.studentSubtitle')}</p>
        </div>
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 right-24 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: t('ielts.listening'), value: listeningCount ?? '—', icon: 'lucide:headphones' },
          { label: t('ielts.reading'), value: readingCount ?? '—', icon: 'lucide:book-open' },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-border/60 bg-card px-4 py-5 text-center shadow-sm">
            <Icon icon={item.icon} className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold tracking-tight text-foreground">{item.value}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-5 sm:grid-cols-2">
        <DashboardCard to="/student/ielts/listening" title={t('ielts.listening')} description={t('dashboard.listeningDesc')} icon="lucide:headphones"
          stat={statOrUndef(listeningCount)} colorScheme="purple" ctaLabel={t('dashboard.start')} />
        <DashboardCard to="/student/ielts/reading" title={t('ielts.reading')} description={t('dashboard.readingDesc')} icon="lucide:book-open"
          stat={statOrUndef(readingCount)} colorScheme="emerald" ctaLabel={t('dashboard.start')} />
        <DashboardCard to="/student/ielts/writing" title={t('ielts.writing')} description={t('dashboard.writingDesc')} icon="lucide:pen-tool"
          badge={t('dashboard.comingSoon')} colorScheme="amber" disabled ctaLabel={t('dashboard.comingSoon')} />
        <DashboardCard to="/student/ielts/speaking" title={t('ielts.speaking')} description={t('dashboard.speakingDesc')} icon="lucide:mic"
          badge={t('dashboard.comingSoon')} colorScheme="rose" disabled ctaLabel={t('dashboard.comingSoon')} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TS**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: 0 new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/student/StudentDashboardPage.tsx
git commit -m "feat: rewrite StudentDashboardPage — hero + stats + cards"
```
