import { useEffect, useState } from 'react';
import { env } from '@/config/env';

export function IeltsTaskViewer({ 
  taskId, 
  onClose 
}: { 
  taskId: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'CLOSE_IELTS_TASK') {
        onClose();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      <iframe
        src={`${env.API_URL}/ielts/${taskId}/view`}
        className="h-full w-full border-none"
        title="IELTS Task"
      />
    </div>
  );
}
