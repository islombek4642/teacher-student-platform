import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { TasksService } from '../tasks/tasks.service';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
    private readonly tasksService: TasksService,
  ) {}

  async groupOverview(teacherProfileId: string, groupId: string) {
    await this.groupsService.findOneOwned(teacherProfileId, groupId);
    const students = await this.prisma.studentProfile.findMany({
      where: { groupId },
      include: { submissions: { select: { score: true } } },
    });
    const allSubmissions = students.flatMap((s) => s.submissions);
    const averageScore =
      allSubmissions.length === 0
        ? 0
        : allSubmissions.reduce((sum, s) => sum + s.score, 0) / allSubmissions.length;

    return {
      studentCount: students.length,
      averageScore,
      tasksCompleted: allSubmissions.length,
    };
  }

  async leaderboard(teacherProfileId: string, groupId: string) {
    await this.groupsService.findOneOwned(teacherProfileId, groupId);
    const students = await this.prisma.studentProfile.findMany({
      where: { groupId },
      include: { submissions: { select: { score: true } } },
    });

    return students
      .map((s) => ({
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        totalScore: s.submissions.reduce((sum, sub) => sum + sub.score, 0),
      }))
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  async taskStats(teacherProfileId: string, taskId: string) {
    let task;
    try {
      task = await this.tasksService.findOneOwned(teacherProfileId, taskId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return { submissionCount: 0, averageScore: 0, mostMissedQuestions: [] };
      }
      throw error;
    }

    const submissions = await this.prisma.submission.findMany({
      where: { taskId },
      include: { answers: true },
    });
    const submissionCount = submissions.length;
    const averageScore =
      submissionCount === 0 ? 0 : submissions.reduce((sum, s) => sum + s.score, 0) / submissionCount;

    const missCounts = new Map<string, number>();
    for (const submission of submissions) {
      for (const answer of submission.answers) {
        if (!answer.isCorrect) {
          missCounts.set(answer.questionId, (missCounts.get(answer.questionId) ?? 0) + 1);
        }
      }
    }
    const questionsById = new Map(task.questions.map((q) => [q.id, q]));
    const mostMissedQuestions = [...missCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([questionId, missCount]) => ({
        id: questionId,
        text: questionsById.get(questionId)?.text ?? '',
        missCount,
      }));

    return { submissionCount, averageScore, mostMissedQuestions };
  }

  async studentProgress(studentProfileId: string) {
    const submissions = await this.prisma.submission.findMany({
      where: { studentId: studentProfileId },
      orderBy: { submittedAt: 'desc' },
    });
    const tasksCompleted = submissions.length;
    const averageScore =
      tasksCompleted === 0 ? 0 : submissions.reduce((sum, s) => sum + s.score, 0) / tasksCompleted;
    const lastActivityAt = submissions[0]?.submittedAt ?? null;

    return { tasksCompleted, averageScore, lastActivityAt };
  }
}
