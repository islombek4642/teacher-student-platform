import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConfirmExit = () => {
    setConfirmOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      <iframe
        src={`${API_URL}/ielts/${taskId}/view`}
        className="h-full w-full border-none"
        title="IELTS Task"
        allowFullScreen
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ielts.exitTitle')}</DialogTitle>
            <DialogDescription>{t('ielts.confirmExit')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmExit}>
              {t('ielts.exit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
