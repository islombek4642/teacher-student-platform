import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { downloadBlob } from '@/utils/fileDownload';
import { exportLeaderboardToPrint } from '@/utils/exportResults';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useGroupOverviewStats,
  useGroupLeaderboard,
  exportGroupStatistics,
} from './api/group-statistics.api';

export function GroupStatisticsPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);

  const { data: overview, isLoading: isOverviewLoading } = useGroupOverviewStats(
    groupId || '',
  );
  const { data: leaderboard, isLoading: isLeaderboardLoading } =
    useGroupLeaderboard(groupId || '');

  const isLoading = isOverviewLoading || isLeaderboardLoading;

  const handleExportExcel = async () => {
    if (!groupId) return;
    setIsExporting(true);
    try {
      const blob = await exportGroupStatistics(groupId);
      downloadBlob(
        blob,
        `${overview?.groupName || 'guruh'}_statistika.xlsx`,
      );
      toast.add({
        type: 'success',
        description: t('statistics.exportSuccess', {
          defaultValue: 'Statistika Excel fayliga muvaffaqiyatli yuklandi',
        }),
      });
    } catch {
      toast.add({
        type: 'error',
        description: t('common.error', { defaultValue: 'Xatolik yuz berdi' }),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPrint = () => {
    if (!leaderboard) return;
    const items = leaderboard.map((s, idx) => ({
      rank: idx + 1,
      fullName: `${s.firstName} ${s.lastName}`,
      username: s.username,
      testsTaken: s.testsTaken,
      averageBand: s.averageBand,
      bestBand: s.bestBand,
      lastActive: s.lastActive,
    }));
    exportLeaderboardToPrint(overview?.groupName || 'Guruh', items);
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Group Max Band */}
        <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent shadow-sm">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('statistics.groupMaxBand')}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <Icon icon="lucide:trophy" className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {overview?.maxBand ? overview.maxBand.toFixed(1) : '0.0'}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                Band
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Listening Max Band */}
        <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent shadow-sm">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('statistics.listeningMaxBand')}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-700 dark:text-purple-300">
                <Icon icon="lucide:headphones" className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {overview?.listeningMaxBand
                  ? overview.listeningMaxBand.toFixed(1)
                  : '0.0'}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                Band
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Reading Max Band */}
        <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent shadow-sm">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('statistics.readingMaxBand')}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <Icon icon="lucide:book-open" className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {overview?.readingMaxBand
                  ? overview.readingMaxBand.toFixed(1)
                  : '0.0'}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                Band
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Total Submissions */}
        <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent shadow-sm">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('statistics.totalSubmissions')}
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                <Icon icon="lucide:check-circle-2" className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-foreground">
                {overview?.totalSubmissions ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">
                ta
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:trophy" className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              {t('statistics.leaderboard')}
            </h3>
            <span className="text-xs text-muted-foreground ml-2">
              {leaderboard ? `(${leaderboard.length} nafar o'quvchi)` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExporting || !leaderboard || leaderboard.length === 0}
              className="gap-1.5"
            >
              <Icon icon="lucide:file-spreadsheet" className="size-4 text-emerald-600" />
              {t('statistics.exportExcel', { defaultValue: 'Excel yuklash' })}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPrint}
              disabled={!leaderboard || leaderboard.length === 0}
              className="gap-1.5"
            >
              <Icon icon="lucide:printer" className="size-4 text-primary" />
              {t('statistics.exportPdf', { defaultValue: 'Chop etish / PDF' })}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40 font-semibold">
              <TableRow className="h-[44px]">
                <TableHead className="w-14 text-center">{t('statistics.rank')}</TableHead>
                <TableHead>{t('statistics.studentName')}</TableHead>
                <TableHead className="w-36">{t('students.username')}</TableHead>
                <TableHead className="w-32 text-center">{t('statistics.tasksCompleted')}</TableHead>
                <TableHead className="w-32 text-center">{t('statistics.bestBand')}</TableHead>
                <TableHead className="w-36 text-center">{t('tasks.averageBand')}</TableHead>
                <TableHead className="w-40 text-right">{t('statistics.lastActive')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow className="h-[52px]">
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              ) : leaderboard && leaderboard.length > 0 ? (
                leaderboard.map((student, index) => {
                  const rank = index + 1;
                  return (
                    <TableRow key={student.studentId} className="h-[52px]">
                      <TableCell className="w-14 text-center">
                        {rank === 1 ? (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-extrabold text-xs shadow-sm">
                            🥇
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-400/20 text-slate-700 dark:text-slate-300 font-extrabold text-xs">
                            🥈
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-800/20 text-amber-900 dark:text-amber-200 font-extrabold text-xs">
                            🥉
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-muted-foreground">
                            {rank}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {student.firstName[0]}
                            {student.lastName[0]}
                          </div>
                          <span className="font-semibold text-foreground">
                            {student.firstName} {student.lastName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="w-36 font-mono text-xs text-muted-foreground">
                        @{student.username}
                      </TableCell>
                      <TableCell className="w-32 text-center text-sm font-medium">
                        {student.testsTaken} ta
                      </TableCell>
                      <TableCell className="w-32 text-center">
                        {student.bestBand > 0 ? (
                          <span className="text-xs font-bold text-foreground">
                            {student.bestBand.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="w-36 text-center">
                        {student.averageBand > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-extrabold text-primary border border-primary/20">
                            <Icon icon="lucide:star" className="h-3 w-3 fill-current" />
                            <span>Band {student.averageBand.toFixed(1)}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="w-40 text-right text-xs text-muted-foreground">
                        {student.lastActive
                          ? new Date(student.lastActive).toLocaleDateString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow className="h-[200px]">
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    <Icon
                      icon="lucide:bar-chart-3"
                      className="mx-auto mb-2 h-10 w-10 opacity-40 text-primary"
                    />
                    <div className="text-base font-semibold text-foreground">
                      {t('statistics.noLeaderboardData')}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                      {t('statistics.noSubmissionsDesc')}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
