import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
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

export function detectIeltsTaskType(contentHtml: string): 'LISTENING' | 'READING' | 'UNKNOWN' {
  const hasAudio =
    /<audio\b/i.test(contentHtml) ||
    /id=["']global-audio-player["']/i.test(contentHtml) ||
    /\.mp3\b/i.test(contentHtml);

  const titleMatch = contentHtml.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].toLowerCase() : '';

  const hasPassage = /passage\s*[1-3]/i.test(contentHtml);
  const hasPart = /part\s*[1-4]/i.test(contentHtml);

  if (hasAudio || title.includes('listening') || (hasPart && !hasPassage)) {
    return 'LISTENING';
  }
  if (hasPassage || title.includes('reading')) {
    return 'READING';
  }
  return 'UNKNOWN';
}

export function extractTaskTitle(contentHtml: string, filename?: string): string {
  // 1. Reading passage title
  const passageTitleMatch = contentHtml.match(/class=["']passage-title["'][^>]*>([^<]+)<\/p>/i);
  if (passageTitleMatch && passageTitleMatch[1]?.trim()) {
    const title = passageTitleMatch[1].trim();
    const testNum = filename ? filename.match(/^0*(\d+)/)?.[1] : null;
    return testNum ? `Test ${testNum}: ${title}` : title;
  }

  // 2. Listening centered title
  const centeredTitleMatch = contentHtml.match(/class=["']centered-title["'][^>]*>([^<]+)<\/p>/i);
  if (centeredTitleMatch && centeredTitleMatch[1]?.trim()) {
    const title = centeredTitleMatch[1].trim();
    const testNum = filename ? filename.match(/^0*(\d+)/)?.[1] : null;
    return testNum ? `Test ${testNum}: ${title}` : title;
  }

  // 3. Fallback to <title> tag if not generic
  const titleTag = contentHtml.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  if (titleTag && !/^ielts\s+cdi/i.test(titleTag)) {
    return titleTag;
  }

  // 4. Fallback to clean filename
  if (filename) {
    return filename
      .replace(/\.html?$/i, '')
      .replace(/[_-]/g, ' ')
      .trim();
  }

  return '';
}

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
  const [fileError, setFileError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<'LISTENING' | 'READING' | 'UNKNOWN' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: upload, isPending } = useUploadIeltsTask();

  const resetForm = () => {
    setTitle('');
    setFile(null);
    setFileError(null);
    setDetectedType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFileError(null);
    setDetectedType(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    try {
      const text = await selectedFile.text();
      const detected = detectIeltsTaskType(text);
      setDetectedType(detected);

      // Check if uploaded file contradicts the section
      if (
        (type === 'LISTENING' && detected === 'READING') ||
        (type === 'READING' && detected === 'LISTENING')
      ) {
        setFileError(
          t('ielts.typeMismatch', {
            expected: t(`ielts.${type.toLowerCase()}`),
            detected: t(`ielts.${detected.toLowerCase()}`),
          }),
        );
        setFile(null);
        return;
      }

      setFile(selectedFile);

      // Auto-extract and populate title
      const extractedTitle = extractTaskTitle(text, selectedFile.name);
      if (extractedTitle) {
        setTitle(extractedTitle);
      }
    } catch {
      setFile(selectedFile);
    }
  };

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
          handleOpenChange(false);
        },
        onError: (err: any) => {
          const message = err?.response?.data?.message || err?.message || t('common.error');
          toast.add({ type: 'error', description: message });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
              ref={fileInputRef}
              type="file"
              accept=".html"
              onChange={handleFileChange}
            />
          </div>

          {fileError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <Icon icon="lucide:alert-circle" className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
              <div className="space-y-1">
                <p className="font-semibold">{fileError}</p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {t('ielts.pleaseUploadExpected', {
                    expected: t(`ielts.${type.toLowerCase()}`),
                  })}
                </p>
              </div>
            </div>
          )}

          {!fileError && file && detectedType && detectedType !== 'UNKNOWN' && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Icon icon="lucide:check-circle-2" className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                {t(`ielts.${detectedType.toLowerCase()}`)} fayli tasdiqlandi ({file.name})
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            {t('common.close')}
          </Button>
          <Button onClick={handleUpload} disabled={isPending || !title.trim() || !file || !!fileError}>
            {isPending ? t('common.loading') : t('ielts.upload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
