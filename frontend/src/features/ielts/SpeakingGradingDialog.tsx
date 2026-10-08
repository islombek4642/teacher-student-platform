import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { Icon } from '@iconify/react';
import { useGradeSpeakingSubmission, type SubmissionToGrade } from './api/ielts.api';
import { computeIeltsBand } from './WritingGradingDialog';

export function SpeakingGradingDialog({
  submission,
  open,
  onOpenChange,
}: {
  submission: SubmissionToGrade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const gradeMutation = useGradeSpeakingSubmission();

  const [fc, setFc] = useState<number>(6.0);
  const [lr, setLr] = useState<number>(6.0);
  const [gra, setGra] = useState<number>(6.0);
  const [pr, setPr] = useState<number>(6.0);
  const [feedback, setFeedback] = useState<string>('');

  useEffect(() => {
    if (submission) {
      if (submission.criteriaJson) {
        const crit: any = submission.criteriaJson;
        setFc(crit.fluencyCoherence ?? 6.0);
        setLr(crit.lexicalResource ?? 6.0);
        setGra(crit.grammaticalAccuracy ?? 6.0);
        setPr(crit.pronunciation ?? 6.0);
      } else {
        setFc(6.0);
        setLr(6.0);
        setGra(6.0);
        setPr(6.0);
      }
      setFeedback(submission.feedback || '');
    }
  }, [submission]);

  if (!submission) return null;

  const audioTracks: { [key: number]: string } = {};
  if (Array.isArray(submission.answersJson)) {
    for (const item of submission.answersJson) {
      if (item.question === 'Part 1' || item.part === 1) audioTracks[1] = item.userAnswer;
      if (item.question === 'Part 2' || item.part === 2) audioTracks[2] = item.userAnswer;
      if (item.question === 'Part 3' || item.part === 3) audioTracks[3] = item.userAnswer;
    }
  }

  const calculatedBand = computeIeltsBand(fc, lr, gra, pr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await gradeMutation.mutateAsync({
        submissionId: submission.id,
        data: {
          fluencyCoherence: fc,
          lexicalResource: lr,
          grammaticalAccuracy: gra,
          pronunciation: pr,
          band: calculatedBand,
          feedback: feedback.trim(),
        },
      });

      toast.add({
        type: 'success',
        description: t('grading.savedSuccess', {
          band: calculatedBand,
          defaultValue: `Baholash saqlandi! Band: ${calculatedBand}`,
        }),
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.add({
        type: 'error',
        description: err?.message || t('grading.saveError', { defaultValue: 'Baholashda xatolik yuz berdi' }),
      });
    }
  };

  const scoreOptions = [
    0.0, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Icon icon="lucide:mic" className="text-primary w-5 h-5" />
                {t('speaking.gradeTitle', { defaultValue: 'Speaking topshirig\'ini tekshirish va baholash' })}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {submission.student.firstName} {submission.student.lastName} ({submission.student.group?.name || 'Guruhsiz'}) — {submission.task.title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={submission.isGraded ? 'default' : 'secondary'} className="text-xs">
                {submission.isGraded ? t('grading.graded', { defaultValue: 'Baholangan' }) : t('grading.ungraded', { defaultValue: 'Baholanmagan' })}
              </Badge>
              {submission.isGraded && (
                <Badge variant="outline" className="font-bold border-primary text-primary">
                  Band {submission.band}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Student Audio Recordings */}
            <div className="border rounded-xl p-4 bg-muted/20 flex flex-col space-y-4">
              <h4 className="font-semibold text-sm border-b pb-2 flex items-center gap-2">
                <Icon icon="lucide:headphones" className="w-4 h-4 text-primary" />
                {t('speaking.studentRecordings', { defaultValue: 'O\'quvchining yozib olgan audio javoblari' })}
              </h4>

              <div className="space-y-3">
                {/* Part 1 */}
                <div className="p-3 rounded-lg bg-card border space-y-1.5">
                  <span className="text-xs font-bold text-primary block">Part 1: Introduction</span>
                  {audioTracks[1] ? (
                    <audio controls src={audioTracks[1]} className="w-full h-9" />
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      {t('speaking.noAudio', { defaultValue: 'Audio mavjud emas' })}
                    </span>
                  )}
                </div>

                {/* Part 2 */}
                <div className="p-3 rounded-lg bg-card border space-y-1.5">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block">Part 2: Long Turn (Cue Card)</span>
                  {audioTracks[2] ? (
                    <audio controls src={audioTracks[2]} className="w-full h-9" />
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      {t('speaking.noAudio', { defaultValue: 'Audio mavjud emas' })}
                    </span>
                  )}
                </div>

                {/* Part 3 */}
                <div className="p-3 rounded-lg bg-card border space-y-1.5">
                  <span className="text-xs font-bold text-primary block">Part 3: Discussion</span>
                  {audioTracks[3] ? (
                    <audio controls src={audioTracks[3]} className="w-full h-9" />
                  ) : (
                    <span className="text-xs text-muted-foreground italic">
                      {t('speaking.noAudio', { defaultValue: 'Audio mavjud emas' })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: IELTS Speaking Rubrics */}
            <div className="space-y-4">
              <div className="p-4 border rounded-xl bg-card space-y-4">
                <h4 className="font-semibold text-sm border-b pb-2 flex items-center justify-between">
                  <span>{t('speaking.rubrics', { defaultValue: 'IELTS Speaking baholash mezonlari' })}</span>
                  <span className="text-primary font-bold text-base">Band: {calculatedBand}</span>
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <Label className="text-xs mb-1 block">
                      FC (Fluency & Coherence): <strong>{fc}</strong>
                    </Label>
                    <select
                      value={fc}
                      onChange={(e) => setFc(parseFloat(e.target.value))}
                      className="w-full h-8 px-2 border rounded-md bg-background text-xs"
                      aria-label="Fluency and Coherence"
                    >
                      {scoreOptions.map((s) => (
                        <option key={`fc-${s}`} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">
                      LR (Lexical Resource): <strong>{lr}</strong>
                    </Label>
                    <select
                      value={lr}
                      onChange={(e) => setLr(parseFloat(e.target.value))}
                      className="w-full h-8 px-2 border rounded-md bg-background text-xs"
                      aria-label="Lexical Resource"
                    >
                      {scoreOptions.map((s) => (
                        <option key={`lr-${s}`} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">
                      GRA (Grammar & Accuracy): <strong>{gra}</strong>
                    </Label>
                    <select
                      value={gra}
                      onChange={(e) => setGra(parseFloat(e.target.value))}
                      className="w-full h-8 px-2 border rounded-md bg-background text-xs"
                      aria-label="Grammatical Range and Accuracy"
                    >
                      {scoreOptions.map((s) => (
                        <option key={`gra-${s}`} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">
                      PR (Pronunciation): <strong>{pr}</strong>
                    </Label>
                    <select
                      value={pr}
                      onChange={(e) => setPr(parseFloat(e.target.value))}
                      className="w-full h-8 px-2 border rounded-md bg-background text-xs"
                      aria-label="Pronunciation"
                    >
                      {scoreOptions.map((s) => (
                        <option key={`pr-${s}`} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <Label htmlFor="speaking-feedback" className="text-xs font-semibold mb-1 block">
                    {t('grading.feedback', { defaultValue: 'O\'qituvchi izohi va tavsiyalari' })}
                  </Label>
                  <textarea
                    id="speaking-feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    placeholder={t('speaking.feedbackPlaceholder', {
                      defaultValue: 'Talaffuz, so\'z boyligi va ravonlik bo\'yicha o\'quvchiga tavsiyalar...',
                    })}
                    className="w-full p-2.5 border rounded-lg bg-background text-xs leading-normal resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={gradeMutation.isPending}
            >
              {t('common.cancel', { defaultValue: 'Bekor qilish' })}
            </Button>
            <Button
              type="submit"
              disabled={gradeMutation.isPending}
              className="gap-2 font-semibold"
            >
              <Icon icon="lucide:check" className="w-4 h-4" />
              {gradeMutation.isPending
                ? t('common.saving', { defaultValue: 'Saqlanmoqda...' })
                : t('grading.saveGrade', { defaultValue: 'Bahoni saqlash' })}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
