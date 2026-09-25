import type { ReactNode } from 'react';
import { cn } from 'cn';

interface PageHeaderProps {
  title?: string | ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, action, className }: PageHeaderProps) {
  if (!title && !action) return null;

  return (
    <div
      className={cn(
        'flex items-center',
        title && action ? 'justify-between' : action ? 'justify-end' : 'justify-start',
        className
      )}
    >
      {title && (typeof title === 'string' ? <h1 className="text-xl font-semibold">{title}</h1> : title)}
      {action && <div>{action}</div>}
    </div>
  );
}
