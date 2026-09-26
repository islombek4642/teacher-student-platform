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

export function GroupsPage() {
  const { t } = useTranslation();
  const { data: groups, isLoading } = useGroups();
  const { mutate: rename } = useRenameGroup();
  const { mutate: remove } = useDeleteGroup();
  const { mutate: importGroups, isPending: isImporting } = useImportGroups();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleExport = async () => {
    try {
      const blob = await exportGroups();
      downloadBlob(blob, t('groups.exportFilename', { defaultValue: 'guruhlar.xlsx' }));
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
            <Icon icon="lucide:download" />
            {t('common.export')}
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
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>{t('groups.name')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {t('groups.loading')}
              </TableCell>
            </TableRow>
          ) : groups && groups.length > 0 ? (
            groups.map((group, index) => (
              <TableRow key={group.id}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  {editingId === group.id ? (
                    <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                  ) : (
                    <Link to={`/teacher/groups/${group.id}`} className="underline">
                      {group.name}
                    </Link>
                  )}
                </TableCell>
                <TableCell className="flex gap-2">
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
                    onClick={() => {
                      if (window.confirm(t('groups.confirmDelete'))) remove(group.id);
                    }}
                  >
                    <Icon icon="lucide:trash-2" />
                    {t('groups.delete')}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {t('groups.empty')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <CreateGroupDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
