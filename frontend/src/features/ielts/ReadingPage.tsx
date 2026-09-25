import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { useTeacherTasks } from './api/ielts.api';
import { UploadIeltsDialog } from './UploadIeltsDialog';
import { IeltsTaskViewer } from './IeltsTaskViewer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function ReadingPage() {
  const { t } = useTranslation();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const { data: tasks, isLoading } = useTeacherTasks();
  
  const readingTasks = tasks?.filter((t) => t.type === 'READING') || [];

  return (
    <div className="space-y-4">
      <PageHeader 
        title={t('ielts.reading')} 
        action={
          <Button onClick={() => setUploadOpen(true)}>
            <Icon icon="lucide:upload" className="mr-2" />
            Topshiriq yuklash
          </Button>
        }
      />
      
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomi</TableHead>
              <TableHead>Sana</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">Yuklanmoqda...</TableCell>
              </TableRow>
            ) : readingTasks.length > 0 ? (
              readingTasks.map(task => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell>{new Date(task.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setViewingTaskId(task.id)}>Ko'rish</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  <Icon icon="lucide:book-open" className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  Hali topshiriqlar yuklanmagan
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <UploadIeltsDialog 
        open={uploadOpen} 
        onOpenChange={setUploadOpen} 
        type="READING" 
      />
      {viewingTaskId && (
        <IeltsTaskViewer 
          taskId={viewingTaskId} 
          onClose={() => setViewingTaskId(null)} 
        />
      )}
    </div>
  );
}
