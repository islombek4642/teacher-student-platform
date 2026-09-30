import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuth } from '@/auth/useAuth';
import { useSubmitIeltsTask } from './api/ielts.api';
import { toast } from '@/components/ui/toast';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export function IeltsTaskViewer({ 
  taskId, 
  onClose 
}: { 
  taskId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { payload } = useAuth();
  const isStudent = payload?.role === 'STUDENT';
  const submitMutation = useSubmitIeltsTask();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CLOSE_IELTS_TASK') {
        setConfirmOpen(true);
      } else if (e.data?.type === 'ESCAPE_PRESSED') {
        setConfirmOpen((prev) => !prev);
      } else if (e.data?.type === 'IELTS_TEST_SUBMITTED' && isStudent && e.data.payload) {
        submitMutation.mutate(
          {
            taskId,
            data: e.data.payload,
          },
          {
            onSuccess: (res) => {
              toast.add({
                type: 'success',
                description: t('ielts.submittedSuccess', {
                  band: res.band,
                  defaultValue: `Topshiriq topshirildi! Band: ${res.band}`,
                }),
              });
            },
            onError: (err: any) => {
              const msg =
                err?.response?.data?.message ||
                err?.message ||
                t('ielts.submitError', { defaultValue: 'Xatolik yuz berdi' });
              toast.add({
                type: 'error',
                description: msg,
              });
            },
          },
        );
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
  }, [taskId, isStudent, submitMutation, t]);

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
