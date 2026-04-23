import { cn } from '../../utils/cn';

type BadgeVariant = 'green' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple' | 'orange';

const variantClasses: Record<BadgeVariant, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  yellow: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  gray: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  orange: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', variantClasses[variant], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    DRAFT: { label: '草稿', variant: 'gray' },
    REVIEW: { label: '审核中', variant: 'yellow' },
    ACTIVE: { label: '生效', variant: 'green' },
    ARCHIVED: { label: '已归档', variant: 'gray' },
  };
  const { label, variant } = map[status] ?? { label: status, variant: 'gray' };
  return <Badge variant={variant}>{label}</Badge>;
}
