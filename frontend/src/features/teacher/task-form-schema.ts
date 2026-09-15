import { z } from 'zod';

const fillBlankQuestion = z.object({
  type: z.literal('FILL_BLANK'),
  text: z.string().min(1, 'required'),
  correctAnswer: z.string().min(1, 'required'),
});

const multipleChoiceQuestion = z
  .object({
    type: z.literal('MULTIPLE_CHOICE'),
    text: z.string().min(1, 'required'),
    options: z.array(z.string().min(1, 'required')).min(2, 'tasks.optionsMinTwo'),
    correctAnswer: z.string().min(1, 'required'),
  })
  .refine((q) => q.options.includes(q.correctAnswer), {
    message: 'tasks.correctAnswerMustBeOption',
    path: ['correctAnswer'],
  });

const questionSchema = z.discriminatedUnion('type', [fillBlankQuestion, multipleChoiceQuestion]);

export const taskFormSchema = z.object({
  groupId: z.string().min(1, 'required'),
  title: z.string().min(1, 'required'),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1, 'tasks.atLeastOneQuestion'),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
