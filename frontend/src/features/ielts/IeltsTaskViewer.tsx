import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuth } from '@/auth/useAuth';
import { useSubmitIeltsTask } from './api/ielts.api';
import { toast } from '@/components/ui/toast';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export function IeltsTaskViewer({ 
  taskId, 
  mode = 'take',
  submissionId,
  onRetake,
  onClose 
}: { 
  taskId: string;
  mode?: 'take' | 'review';
  submissionId?: string;
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
        if (isReviewRef.current || isSubmittedRef.current || !isStudent) {
          onClose();
        } else {
          setConfirmOpen(true);
        }
      } else if (e.data?.type === 'RETAKE_IELTS_TASK') {
        if (onRetake) {
          isSubmittedRef.current = false;
          setIsSubmitted(false);
          onRetake();
        }
      } else if (e.data?.type === 'ESCAPE_PRESSED') {
        if (isReviewRef.current || isSubmittedRef.current || !isStudent) {
          onClose();
        } else {
          setConfirmOpen((prev) => !prev);
        }
      } else if (e.data?.type === 'IELTS_TIME_EXPIRED') {
        toast.add({
          type: 'warning',
          description: t('ielts.timeExpiredAutoSubmit', {
            defaultValue: 'Vaqt tugadi! Javoblaringiz avtomatik topshirilmoqda...',
          }),
        });
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
        if (isReviewRef.current || isSubmittedRef.current || !isStudent) {
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
  }, [taskId, isStudent, onClose, onRetake, submitMutation, t]);

  const handleConfirmExit = () => {
    setConfirmOpen(false);
    onClose();
  };

  const isPreview = !isStudent;
  const iframeSrc = isReview
    ? `${API_URL}/ielts/${taskId}/view?mode=review${submissionId ? `&submissionId=${encodeURIComponent(submissionId)}` : ''}`
    : isPreview
      ? `${API_URL}/ielts/${taskId}/view?preview=true`
      : `${API_URL}/ielts/${taskId}/view`;

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      <iframe
        src={iframeSrc}
        className="w-full h-full border-none"
        title="IELTS Task"
        allowFullScreen
        allow="fullscreen"
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
