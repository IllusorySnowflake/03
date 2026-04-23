import { Home, Beaker, Package, BookOpen, Calculator, Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { PageName } from '../types';

const navItems = [
  { page: 'home' as PageName, label: '工作台', icon: <Home size={18} /> },
  { page: 'nutrients' as PageName, label: '营养管理', icon: <Beaker size={18} /> },
  { page: 'materials' as PageName, label: '原材料', icon: <Package size={18} /> },
  { page: 'formulas' as PageName, label: '产品配方', icon: <BookOpen size={18} /> },
  { page: 'calculator' as PageName, label: '计算引擎', icon: <Calculator size={18} /> },
];

interface Props {
  currentPage: PageName;
  setPage: (p: PageName) => void;
  children: React.ReactNode;
}

export default function Layout({ currentPage, setPage, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-white border-r border-gray-100 flex flex-col shrink-0 transition-all duration-200`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold">
            🥛
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">皇氏乳业</p>
              <p className="text-xs text-gray-400 truncate">配料计算器 v1.0</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
          {navItems.map(item => (
            <button
              key={item.page}
              onClick={() => setPage(item.page)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${currentPage === item.page
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <span className="shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}

          {/* Calculator CTA */}
          {sidebarOpen && currentPage !== 'calculator' && (
            <button
              onClick={() => setPage('calculator')}
              className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm shadow-blue-200"
            >
              <Calculator size={16} />
              开始计算
            </button>
          )}
        </nav>

        {/* Toggle button */}
        <div className="border-t border-gray-100 p-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
