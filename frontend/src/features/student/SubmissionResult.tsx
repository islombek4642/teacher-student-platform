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
          <li key={answer.id} className="space-y-1 rounded-lg border p-3 text-sm">
            <div className="flex items-start gap-2">
              <Icon
                icon={answer.isCorrect ? 'lucide:check-circle' : 'lucide:x-circle'}
                className={`mt-0.5 shrink-0 ${answer.isCorrect ? 'text-green-600' : 'text-destructive'}`}
              />
              <div className="flex-1 space-y-1">
                {answer.questionText && <p className="font-medium">{answer.questionText}</p>}
                <p>
                  <span>{answer.studentAnswer}</span>{' '}
                  <span className="text-muted-foreground">
                    ({answer.isCorrect ? t('studentTasks.correct') : t('studentTasks.incorrect')})
                  </span>
                </p>
                {!answer.isCorrect && answer.correctAnswer && (
                  <p className="text-muted-foreground">
                    {t('studentTasks.correctAnswerIs', { answer: answer.correctAnswer })}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
