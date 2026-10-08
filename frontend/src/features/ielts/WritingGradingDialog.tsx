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
import { useGradeSubmission, type SubmissionToGrade } from './api/ielts.api';

export function computeIeltsBand(tr: number, cc: number, lr: number, gra: number): number {
  const avg = (tr + cc + lr + gra) / 4;
  const floor = Math.floor(avg);
  const remainder = avg - floor;
  if (remainder < 0.25) return floor;
  if (remainder < 0.75) return floor + 0.5;
  return floor + 1.0;
}

export function WritingGradingDialog({
  submission,
  open,
  onOpenChange,
}: {
  submission: SubmissionToGrade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const gradeMutation = useGradeSubmission();

  const [activeTaskTab, setActiveTaskTab] = useState<'task1' | 'task2'>('task1');
  const [tr, setTr] = useState<number>(6.0);
  const [cc, setCc] = useState<number>(6.0);
  const [lr, setLr] = useState<number>(6.0);
  const [gra, setGra] = useState<number>(6.0);
  const [feedback, setFeedback] = useState<string>('');

  useEffect(() => {
    if (submission) {
      if (submission.criteriaJson) {
        setTr(submission.criteriaJson.taskResponse ?? 6.0);
        setCc(submission.criteriaJson.coherenceCohesion ?? 6.0);
        setLr(submission.criteriaJson.lexicalResource ?? 6.0);
        setGra(submission.criteriaJson.grammaticalAccuracy ?? 6.0);
      } else {
        setTr(6.0);
        setCc(6.0);
        setLr(6.0);
        setGra(6.0);
      }
      setFeedback(submission.feedback || '');
    }
  }, [submission]);

  if (!submission) return null;

  let task1Text = '';
  let task2Text = '';
  if (Array.isArray(submission.answersJson)) {
    for (const item of submission.answersJson) {
      if (item.question === 'Task 1' || item.task === 1) {
        task1Text = item.userAnswer || '';
      } else if (item.question === 'Task 2' || item.task === 2) {
        task2Text = item.userAnswer || '';
      }
    }
  }

  const p1Words = task1Text.trim() ? task1Text.trim().split(/\s+/).length : 0;
  const p2Words = task2Text.trim() ? task2Text.trim().split(/\s+/).length : 0;
  const calculatedBand = computeIeltsBand(tr, cc, lr, gra);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await gradeMutation.mutateAsync({
        submissionId: submission.id,
        data: {
          taskResponse: tr,
          coherenceCohesion: cc,
          lexicalResource: lr,
          grammaticalAccuracy: gra,
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
                <Icon icon="lucide:check-circle-2" className="text-primary w-5 h-5" />
                {t('grading.title', { defaultValue: 'Writing inshosini tekshirish va baholash' })}
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
            {/* Left Column: Student Essays */}
            <div className="border rounded-xl p-4 bg-muted/20 flex flex-col space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTaskTab === 'task1' ? 'default' : 'outline'}
                    onClick={() => setActiveTaskTab('task1')}
                    className="h-8 text-xs font-semibold"
                  >
                    Task 1 ({p1Words} {t('grading.words', { defaultValue: 'so\'z' })})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={activeTaskTab === 'task2' ? 'default' : 'outline'}
                    onClick={() => setActiveTaskTab('task2')}
                    className="h-8 text-xs font-semibold"
                  >
                    Task 2 ({p2Words} {t('grading.words', { defaultValue: 'so\'z' })})
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-h-[280px] p-3 rounded-lg bg-background border text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[360px] font-mono selection:bg-primary/20">
                {activeTaskTab === 'task1' ? (
                  task1Text ? (
                    task1Text
                  ) : (
                    <span className="text-muted-foreground italic">
                      {t('grading.noTask1', { defaultValue: 'Task 1 bo\'yicha matn yozilmagan' })}
                    </span>
                  )
                ) : task2Text ? (
                  task2Text
                ) : (
                  <span className="text-muted-foreground italic">
                    {t('grading.noTask2', { defaultValue: 'Task 2 bo\'yicha matn yozilmagan' })}
                  </span>
                )}
              </div>
            </div>

            {/* Right Column: IELTS Rubrics Scoring */}
            <div className="space-y-4">
              <div className="p-4 border rounded-xl bg-card space-y-4">
                <h4 className="font-semibold text-sm border-b pb-2 flex items-center justify-between">
                  <span>{t('grading.rubrics', { defaultValue: 'IELTS baholash mezonlari' })}</span>
                  <span className="text-primary font-bold text-base">Band: {calculatedBand}</span>
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <Label className="text-xs mb-1 block">
                      TR / TA (Task Response): <strong>{tr}</strong>
                    </Label>
                    <select
                      value={tr}
                      onChange={(e) => setTr(parseFloat(e.target.value))}
                      className="w-full h-8 px-2 border rounded-md bg-background text-xs"
                      aria-label="Task Response"
                    >
                      {scoreOptions.map((s) => (
                        <option key={`tr-${s}`} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">
                      CC (Coherence & Cohesion): <strong>{cc}</strong>
                    </Label>
                    <select
                      value={cc}
                      onChange={(e) => setCc(parseFloat(e.target.value))}
                      className="w-full h-8 px-2 border rounded-md bg-background text-xs"
                      aria-label="Coherence and Cohesion"
                    >
                      {scoreOptions.map((s) => (
                        <option key={`cc-${s}`} value={s}>
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
                </div>

                <div className="pt-2">
                  <Label htmlFor="grading-feedback" className="text-xs font-semibold mb-1 block">
                    {t('grading.feedback', { defaultValue: 'O\'qituvchi izohi va tavsiyalari' })}
                  </Label>
                  <textarea
                    id="grading-feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    placeholder={t('grading.feedbackPlaceholder', {
                      defaultValue: 'O\'quvchiga kuchli tomonlari va tuzatilishi kerak bo\'lgan xatolar bo\'yicha batafsil izoh yozing...',
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
