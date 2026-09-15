import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { setLanguage } from '@/i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'uz' ? 'en' : 'uz';

  return (
    <Button variant="ghost" size="sm" onClick={() => setLanguage(next)}>
      {next.toUpperCase()}
    </Button>
  );
}
