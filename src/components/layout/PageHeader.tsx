import { ArrowLeft } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface PageHeaderProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  showBack?: boolean;
}

export function PageHeader({ icon, iconBg, title, subtitle, action, showBack = true }: PageHeaderProps) {
  const { setCurrentPage } = useStore();

  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-start gap-3">
        {showBack && (
          <button
            onClick={() => setCurrentPage('home')}
            className="mt-0.5 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-md mt-0.5`}>
          {icon}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
