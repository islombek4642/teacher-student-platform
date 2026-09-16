import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';

export function PasswordReveal({ value }: { value: string }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    toast.add({ type: 'success', description: t('common.copied') });
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        readOnly
        type={visible ? 'text' : 'password'}
        value={value}
        className="w-16 min-w-0 font-mono tracking-widest"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setVisible((v) => !v)}
        aria-label={t(visible ? 'common.hide' : 'common.show')}
      >
        <Icon icon={visible ? 'lucide:eye-off' : 'lucide:eye'} />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={copy} aria-label={t('common.copy')}>
        <Icon icon="lucide:copy" />
      </Button>
    </div>
  );
}
