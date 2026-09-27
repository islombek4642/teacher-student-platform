import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@iconify/react';

export function GroupTasksPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon icon="lucide:clipboard-list" className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold">{t('tasks.comingSoon', { defaultValue: 'Tez kunda' })}</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t('tasks.comingSoonDesc', {
              defaultValue: 'Guruhga IELTS topshiriqlarini biriktirish va boshqarish imkoniyati tez kunda taqdim etiladi.',
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
