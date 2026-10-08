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
import { useUploadIeltsTask, useIeltsTasks } from './api/ielts.api';
import { extractErrorCode, errorCodeToI18nKey } from '@/lib/error-codes';

export function detectIeltsTaskType(
  contentHtml: string,
  filename?: string,
): 'LISTENING' | 'READING' | 'WRITING' | 'UNKNOWN' {
  const hasWritingMarkers =
    (filename ? /writing/i.test(filename) : false) ||
    /writing-textarea/i.test(contentHtml) ||
    /class=["'][^"']*writing-part[^"']*["']/i.test(contentHtml) ||
    /ielts-writing-part-[12]/i.test(contentHtml) ||
    /<title>[^<]*writing[^<]*<\/title>/i.test(contentHtml);

  if (hasWritingMarkers) {
    return 'WRITING';
  }

  const hasAudio =
    /<audio\b/i.test(contentHtml) ||
    /id=["']global-audio-player["']/i.test(contentHtml) ||
    /\.mp3\b/i.test(contentHtml);

  const titleMatch = contentHtml.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].toLowerCase() : '';

  const hasReadingMarkers =
    /reading-passage/i.test(contentHtml) ||
    /passage-panel/i.test(contentHtml) ||
    /passage-title/i.test(contentHtml) ||
    /passage\s*[1-3]/i.test(contentHtml) ||
    title.includes('reading') ||
    (filename ? /reading/i.test(filename) : false);

  const hasListeningMarkers =
    hasAudio ||
    title.includes('listening') ||
    (filename ? /listening/i.test(filename) : false);

  if (hasListeningMarkers && !hasReadingMarkers) {
    return 'LISTENING';
  }
  if (hasReadingMarkers && !hasListeningMarkers) {
    return 'READING';
  }
  if (hasAudio) {
    return 'LISTENING';
  }
  if (hasReadingMarkers) {
    return 'READING';
  }
  return 'UNKNOWN';
}

function extractTitleFromHtmlBlock(blockHtml: string): string {
  // 1. Reading passage title class
  const passageTitleMatch = blockHtml.match(
    /class=["'][^"']*passage-title[^"']*["'][^>]*>([^<]+)<\/[a-z0-9]+>/i,
  );
  if (passageTitleMatch && passageTitleMatch[1]?.trim()) {
    return passageTitleMatch[1].trim();
  }

  // 2. Reading centered heading (e.g. <h4 class="text-center">)
  const h4Match = blockHtml.match(
    /<h4[^>]*class=["'][^"']*text-center[^"']*["'][^>]*>([^<]+)<\/h4>/i,
  );
  if (h4Match && h4Match[1]?.trim()) {
    return h4Match[1].trim();
  }

  // 3. Listening centered title
  const centeredTitleMatch = blockHtml.match(
    /class=["'][^"']*centered-title[^"']*["'][^>]*>([^<]+)<\/[a-z0-9]+>/i,
  );
  if (centeredTitleMatch && centeredTitleMatch[1]?.trim()) {
    return centeredTitleMatch[1].trim();
  }

  // 4. Other prominent headings, excluding generic terms
  const headings = Array.from(blockHtml.matchAll(/<h[1-4][^>]*>([^<]+)<\/h[1-4]>/gi))
    .map((m) => m[1].trim())
    .filter(
      (t) =>
        !/^(ielts|results?|your\s*results?|transcription|correct\s*answers?:?|part\s*[1-4]|passage\s*[1-3]|section\s*[1-4]|questions?\s*\d+.*|.*writing\s*saved.*|.*successfully.*)$/i.test(
          t.replace(/^[^\w\s]+/, '').trim(),
        ),
    );
  if (headings.length > 0) {
    return headings[0];
  }

  // 5. Form/Notes title in <strong> or <b> (e.g. in Listening Section 1)
  const strongs = Array.from(
    blockHtml.matchAll(/<(strong|b)[^>]*>([^<]{5,60})<\/(strong|b)>/gi),
  )
    .map((m) => m[2].trim())
    .filter(
      (t) =>
        !/^(ielts|results?|your\s*results?|transcription|correct\s*answers?:?|part\s*[1-4]|passage\s*[1-3]|section\s*[1-4]|questions?\s*\d+.*|one\s*word.*|no\s*more\s*than.*|write\s*no\s*more.*|name:?|date:?|address:?|choose.*|letters?.*)$/i.test(
          t,
        ) && !/^[A-E](?:\s*,\s*[A-E])*(?:\s+or\s+[A-E])?$/i.test(t),
    );
  if (strongs.length > 0) {
    return strongs[0];
  }

  return '';
}

export function extractTaskTitle(contentHtml: string, filename?: string): string {
  // 0. Prioritize Writing task extraction
  if (detectIeltsTaskType(contentHtml, filename) === 'WRITING') {
    const writingPromptMatch =
      contentHtml.match(
        /<div[^>]*id=["']part-1["'][\s\S]*?class=["'][^"']*task-prompt[^"']*["'][\s\S]*?<(?:strong|b|p)[^>]*>([\s\S]*?)<\/(?:strong|b|p)>/i,
      ) ||
      contentHtml.match(
        /class=["'][^"']*task-prompt[^"']*["'][\s\S]*?<(?:strong|b|p)[^>]*>([\s\S]*?)<\/(?:strong|b|p)>/i,
      );
    if (writingPromptMatch && writingPromptMatch[1]?.trim()) {
      const clean = writingPromptMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
      if (clean.length > 5 && !/^(write about|ielts|part\s*[1-4])/i.test(clean)) {
        const prefix = filename
          ? filename
              .replace(/\.html?$/i, '')
              .replace(/[-_]+/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())
              .trim()
          : '';
        const shortPrompt = clean.length > 70 ? clean.slice(0, 70).trim() + '...' : clean;
        return prefix ? `${prefix} - ${shortPrompt}` : shortPrompt;
      }
    }
    if (filename) {
      return filename
        .replace(/\.html?$/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
    }
  }

  // 1. Check Listening parts sequentially (Part 1 -> Part 2 -> Part 3 -> Part 4)
  const partRegex = /<div[^>]*id=["']part-(\d+)["'][\s\S]*?(?=<div[^>]*id=["']part-\d+["']|<\/div>\s*<\/div>\s*<audio|$)/gi;
  const parts: Array<{ num: number; html: string }> = [];
  let pMatch: RegExpExecArray | null;
  while ((pMatch = partRegex.exec(contentHtml)) !== null) {
    parts.push({ num: parseInt(pMatch[1], 10), html: pMatch[0] });
  }

  if (parts.length > 0) {
    parts.sort((a, b) => a.num - b.num);
    for (const p of parts) {
      const title = extractTitleFromHtmlBlock(p.html);
      if (title) return title;
    }
  }

  // 2. Check Reading passages sequentially (Passage 1 -> Passage 2 -> Passage 3)
  const passageRegex = /<div[^>]*id=["']passage-(\d+)["'][\s\S]*?(?=<div[^>]*id=["']passage-\d+["']|$)/gi;
  const passages: Array<{ num: number; html: string }> = [];
  let passMatch: RegExpExecArray | null;
  while ((passMatch = passageRegex.exec(contentHtml)) !== null) {
    passages.push({ num: parseInt(passMatch[1], 10), html: passMatch[0] });
  }

  if (passages.length > 0) {
    passages.sort((a, b) => a.num - b.num);
    for (const p of passages) {
      const title = extractTitleFromHtmlBlock(p.html);
      if (title) return title;
    }
  }

  // 3. Fallback: Search across entire document
  const fallback = extractTitleFromHtmlBlock(contentHtml);
  if (fallback) return fallback;

  // 4. Title tag if NOT generic
  const titleTag = contentHtml.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  if (
    titleTag &&
    !/^(ielts\s*cdi.*|ielts\s*full.*|ielts\s*reading.*|ielts\s*listening.*|ielts\s*writing.*|ielts)$/i.test(
      titleTag,
    )
  ) {
    return titleTag;
  }

  // 5. Clean filename
  if (filename) {
    return filename
      .replace(/\.html?$/i, '')
      .replace(/[_-]/g, ' ')
      .trim();
  }

  return '';
}

export interface TaskFileItem {
  id: string;
  file: File;
  title: string;
  detectedType: 'LISTENING' | 'READING' | 'WRITING' | 'UNKNOWN';
  typeMismatchError?: string;
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
  const [detectedType, setDetectedType] = useState<'LISTENING' | 'READING' | 'WRITING' | 'UNKNOWN' | null>(null);
  
  // Multiple files state
  const [items, setItems] = useState<TaskFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: upload, mutateAsync: uploadAsync, isPending } = useUploadIeltsTask();
  const { data: existingTasks } = useIeltsTasks();

  const isDuplicateTitle = Boolean(
    title.trim() &&
    existingTasks?.some(
      (task) =>
        task.type === type &&
        task.title.trim().toLowerCase() === title.trim().toLowerCase(),
    ),
  );

  const resetForm = () => {
    setTitle('');
    setFile(null);
    setFileError(null);
    setDetectedType(null);
    setItems([]);
    setIsUploading(false);
    setUploadProgress({ current: 0, total: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isUploading) return;
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const readFileAsText = (f: File): Promise<string> => {
    if (typeof f.text === 'function') {
      return f.text();
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(f);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = Array.from(e.target.files || []);
    setFileError(null);
    setDetectedType(null);

    if (rawFiles.length === 0) {
      setFile(null);
      setTitle('');
      setItems([]);
      return;
    }

    if (rawFiles.length === 1) {
      setItems([]);
      const selectedFile = rawFiles[0];
      try {
        const text = await readFileAsText(selectedFile);
        const detected = detectIeltsTaskType(text, selectedFile.name);
        setDetectedType(detected);

        // Check if uploaded file contradicts the section
        if (detected !== 'UNKNOWN' && detected !== type) {
          setFileError(
            t('ielts.typeMismatch', {
              expected: t(`ielts.${type.toLowerCase()}`),
              detected: t(`ielts.${detected.toLowerCase()}`),
            }),
          );
          setFile(null);
          setTitle('');
          return;
        }

        setFile(selectedFile);

        // Auto-extract and populate title
        const extractedTitle = extractTaskTitle(text, selectedFile.name);
        if (extractedTitle) {
          setTitle(extractedTitle);
        } else {
          setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
        }
      } catch {
        setFileError(t('common.error'));
        setFile(null);
        setTitle('');
      }
      return;
    }

    // Multiple files selected (> 1)
    setFile(null);
    setTitle('');
    const parsedList: TaskFileItem[] = [];

    for (let i = 0; i < rawFiles.length; i++) {
      const f = rawFiles[i];
      try {
        const text = await readFileAsText(f);
        const detected = detectIeltsTaskType(text, f.name);
        let mismatchErr: string | undefined;

        if (detected !== 'UNKNOWN' && detected !== type) {
          mismatchErr = t('ielts.typeMismatch', {
            expected: t(`ielts.${type.toLowerCase()}`),
            detected: t(`ielts.${detected.toLowerCase()}`),
          });
        }

        const extractedTitle =
          extractTaskTitle(text, f.name) || f.name.replace(/\.[^/.]+$/, '');
        parsedList.push({
          id: `${f.name}_${f.size}_${i}`,
          file: f,
          title: extractedTitle,
          detectedType: detected,
          typeMismatchError: mismatchErr,
        });
      } catch {
        parsedList.push({
          id: `${f.name}_${f.size}_${i}`,
          file: f,
          title: f.name.replace(/\.[^/.]+$/, ''),
          detectedType: 'UNKNOWN',
          typeMismatchError: t('common.error'),
        });
      }
    }

    setItems(parsedList);
  };

  const updateItemTitle = (id: string, newTitle: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item)),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      if (next.length === 0 && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return next;
    });
  };

  const getItemStatus = (item: TaskFileItem, allItems: TaskFileItem[]) => {
    if (item.typeMismatchError) {
      return {
        isValid: false,
        badgeText:
          item.detectedType !== 'UNKNOWN'
            ? t(`ielts.${item.detectedType.toLowerCase()}`)
            : t('common.error'),
        errorText: item.typeMismatchError,
      };
    }

    const trimmed = item.title.trim().toLowerCase();
    if (!trimmed) {
      return {
        isValid: false,
        badgeText: t('required'),
        errorText: t('required'),
      };
    }

    const existsInDb = existingTasks?.some(
      (t) => t.type === type && t.title.trim().toLowerCase() === trimmed,
    );
    if (existsInDb) {
      return {
        isValid: false,
        badgeText: t('ielts.fileDuplicate'),
        errorText: t('ielts.taskAlreadyExists'),
      };
    }

    const duplicateInBatch = allItems.some(
      (other) => other.id !== item.id && other.title.trim().toLowerCase() === trimmed,
    );
    if (duplicateInBatch) {
      return {
        isValid: false,
        badgeText: t('ielts.duplicateInBatch'),
        errorText: t('ielts.duplicateInBatch'),
      };
    }

    return {
      isValid: true,
      badgeText: t('ielts.fileReady'),
    };
  };

  const handleUpload = async () => {
    // Single file upload
    if (items.length === 0) {
      if (!title.trim() || !file) {
        toast.add({ type: 'error', description: t('required') });
        return;
      }
      if (isDuplicateTitle) {
        toast.add({ type: 'error', description: t('ielts.taskAlreadyExists') });
        return;
      }
      upload(
        { title: title.trim(), type, file },
        {
          onSuccess: () => {
            toast.add({ type: 'success', description: t('ielts.uploadSuccess') });
            handleOpenChange(false);
          },
          onError: (err: any) => {
            const errorCode = extractErrorCode(err);
            if (errorCode) {
              toast.add({ type: 'error', description: t(errorCodeToI18nKey(errorCode)) });
            } else {
              const message =
                err?.response?.data?.message || err?.message || t('common.error');
              toast.add({ type: 'error', description: message });
            }
          },
        },
      );
      return;
    }

    // Multiple files upload
    const validItems = items.filter((it) => getItemStatus(it, items).isValid);
    if (validItems.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: validItems.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      setUploadProgress({ current: i + 1, total: validItems.length });
      try {
        await uploadAsync({
          title: item.title.trim(),
          type,
          file: item.file,
        });
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast.add({
        type: 'success',
        description: t('ielts.bulkUploadSuccess', { count: successCount }),
      });
      handleOpenChange(false);
    } else {
      toast.add({
        type: 'error',
        description: t('common.error'),
      });
    }
  };

  const isMulti = items.length > 1;
  const validCount = isMulti
    ? items.filter((it) => getItemStatus(it, items).isValid).length
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {t('ielts.newTask', { type: t(`ielts.${type.toLowerCase()}`) })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* File Picker */}
          <div className="space-y-1.5">
            <Label>{t('ielts.htmlFile')}</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".html"
              multiple
              disabled={isUploading || isPending}
              onChange={handleFileChange}
            />
            <p className="text-[11px] text-muted-foreground">
              {t('ielts.htmlFilesNote')}
            </p>
          </div>

          {/* SINGLE FILE MODE */}
          {!isMulti && (
            <>
              {fileError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  <Icon
                    icon="lucide:alert-circle"
                    className="h-5 w-5 shrink-0 mt-0.5 text-red-500"
                  />
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

              {!fileError && file && (
                <div className="space-y-2">
                  <Label>{t('ielts.taskName')}</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('ielts.exampleTest')}
                    className={
                      isDuplicateTitle
                        ? 'border-red-500 focus-visible:ring-red-500'
                        : ''
                    }
                  />
                  {isDuplicateTitle && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                      <Icon icon="lucide:alert-circle" className="h-4 w-4 shrink-0" />
                      <span>{t('ielts.taskAlreadyExists')}</span>
                    </div>
                  )}
                </div>
              )}

              {!fileError && file && detectedType && detectedType !== 'UNKNOWN' && (
                <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Icon
                    icon="lucide:check-circle-2"
                    className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                  <span>
                    {t(`ielts.${detectedType.toLowerCase()}`)} fayli tasdiqlandi (
                    {file.name})
                  </span>
                </div>
              )}
            </>
          )}

          {/* MULTIPLE FILES MODE */}
          {isMulti && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">
                    {t('ielts.selectedFilesCount', { count: items.length })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({validCount} {t('ielts.fileReady').toLowerCase()})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isUploading}
                  onClick={resetForm}
                  className="h-7 text-xs text-muted-foreground hover:text-red-600"
                >
                  {t('ielts.clearAll')}
                </Button>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5 p-3 rounded-xl border border-primary/20 bg-primary/5">
                  <div className="flex items-center justify-between text-xs font-semibold text-primary">
                    <span className="flex items-center gap-1.5">
                      <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
                      {t('ielts.uploadProgress', {
                        current: uploadProgress.current,
                        total: uploadProgress.total,
                      })}
                    </span>
                    <span>
                      {Math.round(
                        (uploadProgress.current / (uploadProgress.total || 1)) * 100,
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-primary/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${
                          (uploadProgress.current / (uploadProgress.total || 1)) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="max-h-72 overflow-y-auto space-y-2 p-1 border rounded-xl bg-muted/20">
                {items.map((item) => {
                  const status = getItemStatus(item, items);
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border transition-all ${
                        status.isValid
                          ? 'border-border/60 bg-card hover:border-primary/40'
                          : 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon
                            icon={
                              type === 'LISTENING'
                                ? 'lucide:headphones'
                                : 'lucide:book-open'
                            }
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                          />
                          <span
                            className="text-xs font-medium text-foreground truncate max-w-[240px]"
                            title={item.file.name}
                          >
                            {item.file.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            ({(item.file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              status.isValid
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                            }`}
                          >
                            {status.badgeText}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            disabled={isUploading}
                            className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-muted transition-colors"
                          >
                            <Icon icon="lucide:x" className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <Input
                        value={item.title}
                        disabled={isUploading}
                        onChange={(e) => updateItemTitle(item.id, e.target.value)}
                        className={`h-8 text-xs font-medium ${
                          !status.isValid
                            ? 'border-red-300 focus-visible:ring-red-400'
                            : ''
                        }`}
                        placeholder={t('ielts.exampleTest')}
                      />
                      {status.errorText && (
                        <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                          {status.errorText}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t border-border/50">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending || isUploading}
          >
            {t('common.close')}
          </Button>

          {isMulti ? (
            <Button
              onClick={handleUpload}
              disabled={isUploading || isPending || validCount === 0}
            >
              {isUploading
                ? t('common.loading')
                : validCount === items.length
                ? `${t('ielts.upload')} (${validCount})`
                : t('ielts.uploadValidOnly', { count: validCount })}
            </Button>
          ) : (
            <Button
              onClick={handleUpload}
              disabled={
                isPending ||
                !title.trim() ||
                !file ||
                !!fileError ||
                isDuplicateTitle
              }
            >
              {isPending ? t('common.loading') : t('ielts.upload')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
