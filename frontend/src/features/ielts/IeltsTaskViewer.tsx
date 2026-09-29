import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export function IeltsTaskViewer({ 
  taskId, 
  onClose 
}: { 
  taskId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CLOSE_IELTS_TASK') {
        setConfirmOpen(true);
      } else if (e.data?.type === 'ESCAPE_PRESSED') {
        setConfirmOpen((prev) => !prev);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmOpen((prev) => !prev);
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleConfirmExit = () => {
    setConfirmOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[40] bg-background">
      <iframe
        src={`${API_URL}/ielts/${taskId}/view`}
        className="h-full w-full border-none"
        title="IELTS Task"
        allowFullScreen
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('ielts.exitTitle')}
        description={t('ielts.confirmExit')}
        confirmText={t('ielts.exit')}
        cancelText={t('common.cancel')}
        variant="destructive"
        icon="lucide:log-out"
        onConfirm={handleConfirmExit}
      />
    </div>
  );
}
