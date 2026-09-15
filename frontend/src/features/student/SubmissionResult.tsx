import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import type { Submission } from '@/api/types';

export function SubmissionResult({ submission }: { submission: Submission }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <p className="text-lg font-semibold">
        {t('studentTasks.score', { score: submission.score, total: submission.answers.length })}
      </p>
      <ul className="space-y-2">
        {submission.answers.map((answer) => (
          <li key={answer.id} className="flex items-center gap-2 text-sm">
            <Icon
              icon={answer.isCorrect ? 'lucide:check-circle' : 'lucide:x-circle'}
              className={answer.isCorrect ? 'text-green-600' : 'text-destructive'}
            />
            <span>{answer.studentAnswer}</span>
            <span className="text-muted-foreground">
              {answer.isCorrect ? t('studentTasks.correct') : t('studentTasks.incorrect')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
