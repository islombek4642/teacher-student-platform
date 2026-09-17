import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { setLanguage } from '@/i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'uz' ? 'en' : 'uz';

  return (
    <Button variant="ghost" size="sm" onClick={() => setLanguage(next)}>
      <Icon icon="lucide:languages" />
      {next.toUpperCase()}
    </Button>
  );
}
