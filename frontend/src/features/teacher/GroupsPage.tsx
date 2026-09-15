import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDeleteGroup, useGroups, useRenameGroup } from './api/groups.api';
import { CreateGroupDialog } from './CreateGroupDialog';

export function GroupsPage() {
  const { t } = useTranslation();
  const { data: groups } = useGroups();
  const { mutate: rename } = useRenameGroup();
  const { mutate: remove } = useDeleteGroup();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('groups.title')}</h1>
        <Button onClick={() => setDialogOpen(true)}>{t('groups.create')}</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('groups.name')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups?.map((group) => (
            <TableRow key={group.id}>
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
                  {t('groups.delete')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CreateGroupDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
