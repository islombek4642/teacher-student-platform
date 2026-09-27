import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'destructive' | 'default';
  icon?: string;
  isLoading?: boolean;
  loadingText?: string;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'destructive',
  icon = 'lucide:alert-triangle',
  isLoading = false,
  loadingText,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              variant === 'destructive'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            }`}
          >
            <Icon icon={icon} className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-1 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            autoFocus
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText ?? t('common.cancel')}
          </Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading
              ? (loadingText ?? (variant === 'destructive' ? t('common.deleting') : t('common.loading')))
              : (confirmText ?? (variant === 'destructive' ? t('common.delete') : t('common.confirm')))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
