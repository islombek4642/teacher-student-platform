import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { Icon } from '@iconify/react';
import { useCreateSpeakingTask } from './api/ielts.api';

export function CreateSpeakingTaskDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const createMutation = useCreateSpeakingTask();

  const [title, setTitle] = useState('');
  const [part1Questions, setPart1Questions] = useState(
    'What is your full name?\nWhere are you from?\nDo you work or study?\nWhat do you like to do in your free time?'
  );
  const [part2Topic, setPart2Topic] = useState('Describe an important decision you made in your life.');
  const [part2Prompts, setPart2Prompts] = useState(
    'What the decision was\nWhen and why you made it\nWhat happened as a result\nAnd explain how you feel about it now'
  );
  const [part3Questions, setPart3Questions] = useState(
    'Why do some people find it difficult to make decisions?\nDo you think parents should make decisions for their teenagers?\nHow has technology affected decision-making in modern life?'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.add({
        type: 'error',
        description: t('speaking.titleRequired', { defaultValue: 'Topshiriq nomini kiriting' }),
      });
      return;
    }

    const payloadStructure = {
      part1: {
        topic: 'Introduction & Interview',
        questions: part1Questions.split('\n').map((q) => q.trim()).filter(Boolean),
      },
      part2: {
        topic: part2Topic.trim(),
        prompts: part2Prompts.split('\n').map((p) => p.trim()).filter(Boolean),
      },
      part3: {
        topic: 'Two-way Discussion',
        questions: part3Questions.split('\n').map((q) => q.trim()).filter(Boolean),
      },
    };

    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        contentHtml: JSON.stringify(payloadStructure),
      });

      toast.add({
        type: 'success',
        description: t('speaking.createdSuccess', { defaultValue: 'Speaking topshirig\'i muvaffaqiyatli yaratildi!' }),
      });
      setTitle('');
      onOpenChange(false);
    } catch (err: any) {
      toast.add({
        type: 'error',
        description: err?.message || t('common.error'),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Icon icon="lucide:mic" className="text-primary w-5 h-5" />
            {t('speaking.createTaskTitle', { defaultValue: 'Yangi Speaking topshirig\'ini yaratish' })}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-4">
          <div>
            <Label htmlFor="speaking-title" className="text-xs font-semibold mb-1 block">
              {t('ielts.taskName', { defaultValue: 'Topshiriq nomi' })} *
            </Label>
            <Input
              id="speaking-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Speaking Test 1: Decisions & Life"
              className="text-xs h-9"
              required
            />
          </div>

          <div className="p-3.5 border rounded-xl bg-card space-y-2">
            <Label htmlFor="speaking-part1" className="text-xs font-bold text-primary block">
              Part 1: Savollar (har bir savolni alohida qatorda yozing)
            </Label>
            <textarea
              id="speaking-part1"
              rows={3}
              value={part1Questions}
              onChange={(e) => setPart1Questions(e.target.value)}
              className="w-full p-2 border rounded-lg bg-background text-xs leading-normal resize-none font-mono"
            />
          </div>

          <div className="p-3.5 border rounded-xl bg-amber-500/5 border-amber-500/30 space-y-2">
            <Label htmlFor="speaking-part2-topic" className="text-xs font-bold text-amber-700 dark:text-amber-400 block">
              Part 2: Cue Card Mavzusi (Topic)
            </Label>
            <Input
              id="speaking-part2-topic"
              value={part2Topic}
              onChange={(e) => setPart2Topic(e.target.value)}
              className="text-xs h-8 bg-background"
            />
            <Label htmlFor="speaking-part2-prompts" className="text-[11px] font-semibold text-muted-foreground block pt-1">
              Ko'rsatmalar (You should say... har bir band alohida qatorda)
            </Label>
            <textarea
              id="speaking-part2-prompts"
              rows={3}
              value={part2Prompts}
              onChange={(e) => setPart2Prompts(e.target.value)}
              className="w-full p-2 border rounded-lg bg-background text-xs leading-normal resize-none font-mono"
            />
          </div>

          <div className="p-3.5 border rounded-xl bg-card space-y-2">
            <Label htmlFor="speaking-part3" className="text-xs font-bold text-primary block">
              Part 3: Discussion savollari (har bir savol alohida qatorda)
            </Label>
            <textarea
              id="speaking-part3"
              rows={3}
              value={part3Questions}
              onChange={(e) => setPart3Questions(e.target.value)}
              className="w-full p-2 border rounded-lg bg-background text-xs leading-normal resize-none font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              {t('common.cancel', { defaultValue: 'Bekor qilish' })}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending}
              className="gap-2 font-semibold"
            >
              <Icon icon="lucide:check" className="w-4 h-4" />
              {createMutation.isPending
                ? t('common.saving', { defaultValue: 'Yaratilmoqda...' })
                : t('common.create', { defaultValue: 'Yaratish' })}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
