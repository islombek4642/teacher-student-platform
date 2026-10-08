import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@iconify/react';
import { toast } from '@/components/ui/toast';
import { AudioRecorder } from './components/AudioRecorder';
import { apiClient } from '@/api/client';
import { useSubmitIeltsTask } from './api/ielts.api';

export type SpeakingContent = {
  part1?: {
    topic?: string;
    questions: string[];
  };
  part2?: {
    topic: string;
    prompts: string[];
  };
  part3?: {
    topic?: string;
    questions: string[];
  };
};

export function parseSpeakingContent(contentHtml: string): SpeakingContent {
  try {
    const parsed = JSON.parse(contentHtml);
    if (parsed.part1 || parsed.part2 || parsed.part3) {
      return parsed;
    }
  } catch (e) {
    // Fallback if contentHtml is plain text or HTML
  }

  return {
    part1: {
      topic: 'Introduction & General Questions',
      questions: [
        'Could you tell me your full name and where you are from?',
        'Do you work or are you a student?',
        'What do you like most about your hometown?',
        'How do you usually spend your weekends?',
      ],
    },
    part2: {
      topic: 'Describe a memorable journey or trip you have taken.',
      prompts: [
        'Where you went and who you went with',
        'What you did during the trip',
        'What made this trip memorable',
        'And explain how you felt about this experience',
      ],
    },
    part3: {
      topic: 'Travel, Culture and Modern Society',
      questions: [
        'Why do people enjoy traveling to new places?',
        'How has international travel changed compared to the past?',
        'What are the advantages and disadvantages of tourism for local cultures?',
      ],
    },
  };
}

export function SpeakingTaskRunner({
  taskId,
  taskTitle,
  contentHtml,
  mode = 'take',
  existingSubmission,
  onClose,
}: {
  taskId: string;
  taskTitle: string;
  contentHtml?: string;
  mode?: 'take' | 'review';
  existingSubmission?: any;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isReview = mode === 'review';
  const submitMutation = useSubmitIeltsTask();

  const [activePart, setActivePart] = useState<1 | 2 | 3>(1);
  const [content] = useState<SpeakingContent>(() => parseSpeakingContent(contentHtml || ''));

  // Audio Blobs for each part
  const [part1Blob, setPart1Blob] = useState<Blob | null>(null);
  const [part2Blob, setPart2Blob] = useState<Blob | null>(null);
  const [part3Blob, setPart3Blob] = useState<Blob | null>(null);

  // Audio URLs from submission in review mode
  const [reviewAudioUrls, setReviewAudioUrls] = useState<{ [key: number]: string }>({});

  // Part 2 Preparation timer (60s)
  const [prepSecondsLeft, setPrepSecondsLeft] = useState<number>(60);
  const [isPrepping, setIsPrepping] = useState<boolean>(false);
  const [prepFinished, setPrepFinished] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingSubmission && Array.isArray(existingSubmission.answersJson)) {
      const urls: { [key: number]: string } = {};
      for (const item of existingSubmission.answersJson) {
        if (item.question === 'Part 1' || item.part === 1) urls[1] = item.userAnswer;
        if (item.question === 'Part 2' || item.part === 2) urls[2] = item.userAnswer;
        if (item.question === 'Part 3' || item.part === 3) urls[3] = item.userAnswer;
      }
      setReviewAudioUrls(urls);
    }
  }, [existingSubmission]);

  useEffect(() => {
    let interval: any = null;
    if (isPrepping && prepSecondsLeft > 0) {
      interval = setInterval(() => {
        setPrepSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsPrepping(false);
            setPrepFinished(true);
            toast.add({
              type: 'info',
              description: t('speaking.prepFinished', { defaultValue: '1 daqiqalik tayyorgarlik vaqti tugadi! Gapirishni boshlang.' }),
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPrepping, prepSecondsLeft, t]);

  const startPrepTimer = () => {
    setPrepSecondsLeft(60);
    setIsPrepping(true);
    setPrepFinished(false);
  };

  const uploadAudioBlob = async (blob: Blob, partName: string) => {
    const formData = new FormData();
    formData.append('audio', blob, `${taskId}-${partName}.webm`);
    const res = await apiClient.post('/ielts/speaking/upload-audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.audioUrl;
  };

  const handleFinalSubmit = async () => {
    if (!part1Blob && !part2Blob && !part3Blob) {
      toast.add({
        type: 'warning',
        description: t('speaking.noRecordingsWarning', { defaultValue: 'Kamida bitta qism bo\'yicha ovoz yozib oling' }),
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const results: any[] = [];

      if (part1Blob) {
        const url1 = await uploadAudioBlob(part1Blob, 'part1');
        results.push({ question: 'Part 1', userAnswer: url1, isCorrect: false });
      }
      if (part2Blob) {
        const url2 = await uploadAudioBlob(part2Blob, 'part2');
        results.push({ question: 'Part 2', userAnswer: url2, isCorrect: false });
      }
      if (part3Blob) {
        const url3 = await uploadAudioBlob(part3Blob, 'part3');
        results.push({ question: 'Part 3', userAnswer: url3, isCorrect: false });
      }

      await submitMutation.mutateAsync({
        taskId,
        data: {
          score: 0,
          total: 40,
          band: 0,
          results,
        },
      });

      toast.add({
        type: 'success',
        description: t('speaking.submittedSuccess', { defaultValue: 'Speaking topshirig\'i muvaffaqiyatli topshirildi! O\'qituvchi tekshiruvidan so\'ng baholanadi.' }),
      });
      onClose();
    } catch (err: any) {
      toast.add({
        type: 'error',
        description: err?.message || t('speaking.submitError', { defaultValue: 'Topshirishda xatolik yuz berdi' }),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden animate-in fade-in">
      {/* Top Header */}
      <header className="h-14 border-b px-6 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1 font-semibold">
            <Icon icon="lucide:mic" className="w-3.5 h-3.5 text-primary" />
            Speaking
          </Badge>
          <h2 className="font-bold text-base truncate max-w-md">{taskTitle}</h2>
        </div>

        <div className="flex items-center gap-2">
          {isReview && existingSubmission && (
            <Badge variant="outline" className="font-bold border-primary text-primary px-3 py-1">
              {existingSubmission.isGraded
                ? `Band ${existingSubmission.band}`
                : t('grading.ungraded', { defaultValue: 'Kutilmoqda' })}
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5 text-xs">
            <Icon icon="lucide:x" className="w-4 h-4" />
            {t('common.close', { defaultValue: 'Yopish' })}
          </Button>
        </div>
      </header>

      {/* Parts Navigation Bar */}
      <div className="bg-muted/40 border-b px-6 py-2.5 flex items-center justify-center gap-3 shrink-0">
        <Button
          size="sm"
          variant={activePart === 1 ? 'default' : 'outline'}
          onClick={() => setActivePart(1)}
          className="text-xs font-semibold gap-2"
        >
          <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-[10px]">1</span>
          Part 1: Introduction
          {part1Blob && <Icon icon="lucide:check-circle" className="w-3.5 h-3.5 text-emerald-400" />}
        </Button>
        <Button
          size="sm"
          variant={activePart === 2 ? 'default' : 'outline'}
          onClick={() => setActivePart(2)}
          className="text-xs font-semibold gap-2"
        >
          <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-[10px]">2</span>
          Part 2: Cue Card
          {part2Blob && <Icon icon="lucide:check-circle" className="w-3.5 h-3.5 text-emerald-400" />}
        </Button>
        <Button
          size="sm"
          variant={activePart === 3 ? 'default' : 'outline'}
          onClick={() => setActivePart(3)}
          className="text-xs font-semibold gap-2"
        >
          <span className="w-5 h-5 rounded-full bg-background/20 flex items-center justify-center text-[10px]">3</span>
          Part 3: Discussion
          {part3Blob && <Icon icon="lucide:check-circle" className="w-3.5 h-3.5 text-emerald-400" />}
        </Button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 max-w-4xl w-full mx-auto space-y-6">
        {/* PART 1 */}
        {activePart === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="p-5 border rounded-2xl bg-card space-y-3 shadow-sm">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <Icon icon="lucide:message-square" className="w-5 h-5" />
                Part 1: {content.part1?.topic || 'Introduction'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('speaking.part1Desc', { defaultValue: 'Quyidagi savollarni diqqat bilan o\'qing va ularga erkin, tabiiy ravishda javob bering (1-2 daqiqa).' })}
              </p>
              <ul className="space-y-2 pt-2 border-t">
                {content.part1?.questions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed">
                    <span className="font-bold text-primary shrink-0">{idx + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 border rounded-2xl bg-card space-y-3">
              <h4 className="font-semibold text-sm">
                {t('speaking.recordAnswer', { defaultValue: 'Part 1 bo\'yicha javobingizni yozib oling' })}
              </h4>
              <AudioRecorder
                existingAudioUrl={reviewAudioUrls[1]}
                disabled={isReview}
                maxDurationSeconds={180}
                onAudioReady={(blob) => setPart1Blob(blob)}
              />
            </div>
          </div>
        )}

        {/* PART 2 */}
        {activePart === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="p-5 border rounded-2xl bg-amber-500/5 border-amber-500/30 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <h3 className="font-bold text-lg text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <Icon icon="lucide:clipboard-list" className="w-5 h-5" />
                  Part 2: Candidate Task Card
                </h3>
                <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 font-semibold">
                  1 min prep • 2 min talk
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="font-bold text-base text-foreground">
                  {content.part2?.topic}
                </p>
                <p className="text-xs text-muted-foreground font-semibold">
                  You should say:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90 pl-2">
                  {content.part2?.prompts.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>

              {!isReview && (
                <div className="pt-3 border-t border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant={isPrepping ? 'secondary' : 'default'}
                      onClick={startPrepTimer}
                      disabled={isPrepping}
                      className="gap-2 text-xs font-semibold"
                    >
                      <Icon icon="lucide:timer" className="w-4 h-4" />
                      {isPrepping
                        ? t('speaking.prepping', { defaultValue: 'Tayyorgarlik ketmoqda...' })
                        : t('speaking.startPrep', { defaultValue: '1 daqiqalik tayyorgarlik taymerini yoqish' })}
                    </Button>
                    {(isPrepping || prepFinished) && (
                      <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                        00:{prepSecondsLeft < 10 ? '0' : ''}{prepSecondsLeft}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border rounded-2xl bg-card space-y-3">
              <h4 className="font-semibold text-sm">
                {t('speaking.recordAnswerPart2', { defaultValue: 'Part 2 bo\'yicha 1-2 daqiqalik nutqingizni yozib oling' })}
              </h4>
              <AudioRecorder
                existingAudioUrl={reviewAudioUrls[2]}
                disabled={isReview}
                maxDurationSeconds={130}
                onAudioReady={(blob) => setPart2Blob(blob)}
              />
            </div>
          </div>
        )}

        {/* PART 3 */}
        {activePart === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="p-5 border rounded-2xl bg-card space-y-3 shadow-sm">
              <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                <Icon icon="lucide:help-circle" className="w-5 h-5" />
                Part 3: Two-way Discussion ({content.part3?.topic || 'Discussion'})
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('speaking.part3Desc', { defaultValue: 'Mavzu bo\'yicha chuqurroq tahliliy savollarga asosli javob bering (2-3 daqiqa).' })}
              </p>
              <ul className="space-y-2 pt-2 border-t">
                {content.part3?.questions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm leading-relaxed">
                    <span className="font-bold text-primary shrink-0">{idx + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 border rounded-2xl bg-card space-y-3">
              <h4 className="font-semibold text-sm">
                {t('speaking.recordAnswerPart3', { defaultValue: 'Part 3 bo\'yicha javobingizni yozib oling' })}
              </h4>
              <AudioRecorder
                existingAudioUrl={reviewAudioUrls[3]}
                disabled={isReview}
                maxDurationSeconds={180}
                onAudioReady={(blob) => setPart3Blob(blob)}
              />
            </div>
          </div>
        )}

        {/* Review feedback section if graded */}
        {isReview && existingSubmission && existingSubmission.isGraded && (
          <div className="p-5 border rounded-2xl bg-primary/5 border-primary/20 space-y-3 animate-in fade-in">
            <h4 className="font-bold text-sm text-primary flex items-center justify-between">
              <span>{t('grading.title', { defaultValue: 'O\'qituvchi bahosi va izohi' })}</span>
              <span className="text-base font-extrabold">Band {existingSubmission.band}</span>
            </h4>
            {existingSubmission.criteriaJson && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div className="p-2 border rounded-lg bg-card">
                  <span className="text-muted-foreground block">Fluency (FC):</span>
                  <span className="font-bold text-sm">{existingSubmission.criteriaJson.fluencyCoherence}</span>
                </div>
                <div className="p-2 border rounded-lg bg-card">
                  <span className="text-muted-foreground block">Lexical (LR):</span>
                  <span className="font-bold text-sm">{existingSubmission.criteriaJson.lexicalResource}</span>
                </div>
                <div className="p-2 border rounded-lg bg-card">
                  <span className="text-muted-foreground block">Grammar (GRA):</span>
                  <span className="font-bold text-sm">{existingSubmission.criteriaJson.grammaticalAccuracy}</span>
                </div>
                <div className="p-2 border rounded-lg bg-card">
                  <span className="text-muted-foreground block">Pronunciation (PR):</span>
                  <span className="font-bold text-sm">{existingSubmission.criteriaJson.pronunciation}</span>
                </div>
              </div>
            )}
            {existingSubmission.feedback && (
              <div className="pt-2 border-t">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">
                  {t('grading.feedback', { defaultValue: 'Izoh:' })}
                </span>
                <p className="text-sm bg-card p-3 rounded-lg border leading-relaxed">
                  {existingSubmission.feedback}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="h-16 border-t px-6 flex items-center justify-between bg-card shrink-0">
        <div className="flex items-center gap-2">
          {activePart > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActivePart((prev) => (prev - 1) as any)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Icon icon="lucide:arrow-left" className="w-3.5 h-3.5" />
              {t('common.prev', { defaultValue: 'Oldingi qism' })}
            </Button>
          )}
          {activePart < 3 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActivePart((prev) => (prev + 1) as any)}
              className="gap-1.5 text-xs font-semibold"
            >
              {t('common.next', { defaultValue: 'Keyingi qism' })}
              <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {!isReview && (
          <Button
            type="button"
            variant="default"
            disabled={isSubmitting}
            onClick={handleFinalSubmit}
            className="gap-2 font-bold px-6 shadow-md"
          >
            <Icon icon="lucide:send" className="w-4 h-4" />
            {isSubmitting
              ? t('common.saving', { defaultValue: 'Topshirilmoqda...' })
              : t('speaking.submitSpeaking', { defaultValue: 'Speaking testini topshirish' })}
          </Button>
        )}
      </footer>
    </div>
  );
}
