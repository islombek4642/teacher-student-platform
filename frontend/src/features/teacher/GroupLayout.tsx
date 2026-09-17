import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGroup } from './api/groups.api';

const TABS = ['students', 'tasks', 'statistics'] as const;
type TabValue = (typeof TABS)[number];

const TAB_LABEL_KEYS: Record<TabValue, string> = {
  students: 'students.title',
  tasks: 'tasks.title',
  statistics: 'statistics.title',
};

export function GroupLayout() {
  const { t } = useTranslation();
  const { id: groupId } = useParams<{ id: string }>();
  const group = useGroup(groupId!);
  const location = useLocation();
  const navigate = useNavigate();

  // /teacher/groups/:id/<tab>[/...] — segment 4 is the active tab, whether
  // it's a bare tab route or a sub-route like tasks/new.
  const activeTab = (location.pathname.split('/')[4] as TabValue | undefined) ?? 'students';

  return (
    <div className="space-y-4">
      <Link
        to="/teacher/groups"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <Icon icon="lucide:arrow-left" className="h-4 w-4" />
        {t('groups.backToList')}
      </Link>
      <h1 className="text-xl font-semibold">{group?.name}</h1>
      <Tabs value={activeTab} onValueChange={(value) => navigate(`/teacher/groups/${groupId}/${value}`)}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(TAB_LABEL_KEYS[tab])}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Outlet />
    </div>
  );
}
