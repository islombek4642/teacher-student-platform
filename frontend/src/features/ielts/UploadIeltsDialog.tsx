import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUploadIeltsTask } from './api/ielts.api';

export function UploadIeltsDialog({
  open,
  onOpenChange,
  type,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'LISTENING' | 'READING' | 'WRITING' | 'SPEAKING';
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const { mutate: upload, isPending } = useUploadIeltsTask();

  const handleUpload = () => {
    if (!title.trim() || !file) {
      toast.add({ type: 'error', description: t('required') });
      return;
    }
    upload(
      { title, type, file },
      {
        onSuccess: () => {
          toast.add({ type: 'success', description: t('ielts.uploadSuccess') });
          onOpenChange(false);
          setTitle('');
          setFile(null);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('ielts.newTask', { type: t(`ielts.${type.toLowerCase()}`) })}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t('ielts.taskName')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('ielts.exampleTest')}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('ielts.htmlFile')}</Label>
            <Input
              type="file"
              accept=".html"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('common.close')}
          </Button>
          <Button onClick={handleUpload} disabled={isPending || !title || !file}>
            {isPending ? t('common.loading') || 'Loading...' : t('ielts.upload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
