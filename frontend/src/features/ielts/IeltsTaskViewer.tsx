import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuth } from '@/auth/useAuth';
import { useSubmitIeltsTask } from './api/ielts.api';
import { toast } from '@/components/ui/toast';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export function IeltsTaskViewer({ 
  taskId, 
  mode = 'take',
  onRetake,
  onClose 
}: { 
  taskId: string;
  mode?: 'take' | 'review';
  onRetake?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { payload } = useAuth();
  const isStudent = payload?.role === 'STUDENT';
  const isReview = mode === 'review';
  const submitMutation = useSubmitIeltsTask();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [, setIsSubmitted] = useState(false);
  const isSubmittedRef = useRef(false);
  const isReviewRef = useRef(isReview);

  useEffect(() => {
    isReviewRef.current = isReview;
  }, [isReview]);

  useEffect(() => {
    isSubmittedRef.current = false;
    setIsSubmitted(false);
  }, [taskId, mode]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CLOSE_IELTS_TASK') {
        if (isReviewRef.current || isSubmittedRef.current) {
          onClose();
        } else {
          setConfirmOpen(true);
        }
      } else if (e.data?.type === 'ESCAPE_PRESSED') {
        if (isReviewRef.current || isSubmittedRef.current) {
          onClose();
        } else {
          setConfirmOpen((prev) => !prev);
        }
      } else if (e.data?.type === 'IELTS_TEST_SUBMITTED' && isStudent && !isReviewRef.current && e.data.payload) {
        isSubmittedRef.current = true;
        setIsSubmitted(true);
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
        if (isReviewRef.current || isSubmittedRef.current) {
          onClose();
        } else {
          setConfirmOpen((prev) => !prev);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [taskId, isStudent, onClose, submitMutation, t]);

  const handleConfirmExit = () => {
    setConfirmOpen(false);
    onClose();
  };

  const iframeSrc = isReview
    ? `${API_URL}/ielts/${taskId}/view?mode=review`
    : `${API_URL}/ielts/${taskId}/view`;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {isReview && (
        <div className="flex items-center justify-between border-b border-border/80 bg-muted/90 px-4 py-2 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Icon icon="lucide:shield-alert" className="h-3.5 w-3.5" />
              <span>{t('ielts.reviewModeBanner')}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onRetake && (
              <Button
                size="sm"
                onClick={() => {
                  isSubmittedRef.current = false;
                  setIsSubmitted(false);
                  onRetake();
                }}
                className="gap-1.5 text-xs bg-primary font-semibold h-8"
              >
                <Icon icon="lucide:rotate-ccw" className="h-3.5 w-3.5" />
                <span>{t('ielts.retakeTest')}</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="gap-1 text-xs h-8"
            >
              <Icon icon="lucide:x" className="h-3.5 w-3.5" />
              <span>{t('ielts.exitReview')}</span>
            </Button>
          </div>
        </div>
      )}

      <iframe
        src={iframeSrc}
        className="flex-1 w-full border-none"
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
        className="z-[110]"
        overlayClassName="z-[110]"
      />
    </div>
  );
}
