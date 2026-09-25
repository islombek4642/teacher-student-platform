import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@iconify/react';

export function ListeningPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <PageHeader title={t('ielts.listening')} />
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-24 text-center">
          <Icon icon="lucide:headphones" className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">{t('ielts.comingSoon')}</h2>
          <p className="mt-2 text-muted-foreground">{t('ielts.listeningDesc')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
