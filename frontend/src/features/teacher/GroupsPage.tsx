import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { downloadBlob } from '@/utils/fileDownload';
import { useDeleteGroup, useGroups, useRenameGroup, useImportGroups, exportGroups } from './api/groups.api';
import { CreateGroupDialog } from './CreateGroupDialog';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { usePaginationKeyboard } from '@/hooks/usePaginationKeyboard';

export function GroupsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data: response, isLoading } = useGroups(page);
  const groups = response?.data;
  const meta = response?.meta;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const { mutate: rename } = useRenameGroup();
  const { mutate: remove, isPending: isRemoving } = useDeleteGroup();
  const { mutate: importGroups, isPending: isImporting } = useImportGroups();
  const fileInputRef = useRef<HTMLInputElement>(null);

  usePaginationKeyboard({
    page,
    totalPages: meta?.lastPage ?? 1,
    setPage,
    enabled: !dialogOpen && !groupToDelete,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const hasGroups = (meta?.total ?? 0) > 0;

  const handleExport = async () => {
    try {
      const blob = await exportGroups();
      if (!hasGroups) {
        downloadBlob(blob, t('groups.sampleFilename', { defaultValue: 'namuna_guruhlar.xlsx' }));
        toast.add({
          type: 'info',
          description: t('groups.sampleDownloadedNotice', {
            defaultValue: "Guruhlar bo'sh bo'lgani sababli namuna fayl yuklab berildi",
          }),
        });
      } else {
        downloadBlob(blob, t('groups.exportFilename', { defaultValue: 'guruhlar.xlsx' }));
      }
    } catch (err) {
      toast.add({ type: 'error', description: t('common.error') });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importGroups(file, {
      onSuccess: (data) => {
        toast.add({ type: 'success', description: t('common.imported', { count: data.success }) });
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      onError: () => toast.add({ type: 'error', description: t('common.error') })
    });
  };

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx" onChange={handleImport} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('groups.title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Icon icon={hasGroups ? 'lucide:download' : 'lucide:file-spreadsheet'} />
            {hasGroups ? t('common.export') : t('groups.downloadSample', { defaultValue: 'Namuna yuklash' })}
          </Button>
          <Button variant="outline" disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
            <Icon icon="lucide:upload" />
            {t('common.import')}
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Icon icon="lucide:plus" />
            {t('groups.create')}
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader className="bg-muted/50 font-semibold">
          <TableRow className="h-[44px]">
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>{t('groups.name')}</TableHead>
            <TableHead className="w-48 text-right" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow className="h-[52px]">
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {t('groups.loading')}
              </TableCell>
            </TableRow>
          ) : groups && groups.length > 0 ? (
            groups.map((group, index) => (
              <TableRow key={group.id} className="h-[52px]">
                <TableCell className="w-12 text-center text-muted-foreground">{(page - 1) * 10 + index + 1}</TableCell>
                <TableCell className="font-medium">
                  {editingId === group.id ? (
                    <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                  ) : (
                    <Link to={`/teacher/groups/${group.id}`} className="underline">
                      {group.name}
                    </Link>
                  )}
                </TableCell>
                <TableCell className="w-48 text-right">
                  <div className="flex justify-end gap-2">
                    {editingId === group.id ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!editingName.trim()) return;
                          rename({ id: group.id, name: editingName }, { onSuccess: () => setEditingId(null) });
                        }}
                      >
                        <Icon icon="lucide:check" />
                        {t('groups.rename')}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingId(group.id);
                          setEditingName(group.name);
                        }}
                      >
                        <Icon icon="lucide:pencil" />
                        {t('groups.rename')}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setGroupToDelete(group.id)}
                    >
                      <Icon icon="lucide:trash-2" />
                      {t('groups.delete')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow className="h-[200px]">
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                {t('groups.empty')}
              </TableCell>
            </TableRow>
          )}
          {groups && groups.length > 0 && groups.length < 10 && (
            Array.from({ length: 10 - groups.length }).map((_, i) => (
              <TableRow key={`empty-${i}`} className="h-[52px] pointer-events-none select-none">
                <TableCell className="w-12 text-center text-muted-foreground">&nbsp;</TableCell>
                <TableCell>&nbsp;</TableCell>
                <TableCell className="w-48 text-right">&nbsp;</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {meta && meta.lastPage > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            {t('groups.totalCount', { count: meta.total, defaultValue: `Jami: ${meta.total}` })}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              {t('common.prev')}
            </Button>
            <Button variant="outline" size="sm" disabled={page === meta.lastPage} onClick={() => setPage(page + 1)}>
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}

      <CreateGroupDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={!!groupToDelete}
        onOpenChange={(open) => !open && setGroupToDelete(null)}
        title={t('common.confirmDelete')}
        description={t('groups.confirmDelete')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="destructive"
        isLoading={isRemoving}
        onConfirm={() => {
          if (groupToDelete) {
            remove(groupToDelete, {
              onSuccess: () => setGroupToDelete(null),
            });
          }
        }}
      />
    </div>
  );
}
