import {
  FlaskConical,
  Package,
  ClipboardList,
  Calculator,
  Database,
  BarChart3,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { AppPage } from '../../store/useStore';

interface ModuleCard {
  icon: React.ReactNode;
  title: string;
  desc: string;
  page: AppPage;
  color: string;
  stats?: string;
  tag?: string;
}

export function HomePage() {
  const { setCurrentPage, nutrients, materials, batches, formulaStandards } = useStore();

  const today = new Date();
  const expiringBatches = batches.filter(b => {
    const exp = new Date(b.expiryDate);
    const diff = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  });

  const activeForms = formulaStandards.filter(f => f.status === 'ACTIVE');

  const modules: ModuleCard[] = [
    {
      icon: <FlaskConical size={22} />,
      title: '营养字典',
      desc: '管理全系统营养指标定义',
      page: 'nutrients',
      color: 'from-violet-500 to-purple-600',
      stats: `${nutrients.length} 个指标`,
    },
    {
      icon: <Package size={22} />,
      title: '原材料主数据',
      desc: '原料基础属性与营养信息',
      page: 'materials',
      color: 'from-blue-500 to-cyan-600',
      stats: `${materials.filter(m => m.isActive).length} 种原料`,
    },
    {
      icon: <ClipboardList size={22} />,
      title: '原料批次管理',
      desc: 'LIMS检测数据与库存管理',
      page: 'batches',
      color: 'from-emerald-500 to-teal-600',
      stats: `${batches.length} 个批次`,
      tag: expiringBatches.length > 0 ? `${expiringBatches.length}临期` : undefined,
    },
    {
      icon: <Layers size={22} />,
      title: '配方标准',
      desc: '研发维护的产品配方规则',
      page: 'formula-standards',
      color: 'from-orange-500 to-amber-600',
      stats: `${activeForms.length} 个生效`,
    },
    {
      icon: <Calculator size={22} />,
      title: '原料标准化',
      desc: '生鲜原料标准化计算（M04）',
      page: 'standardization',
      color: 'from-pink-500 to-rose-600',
    },
    {
      icon: <FlaskConical size={22} />,
      title: '配方优化计算',
      desc: '基于LP求解最优配方（M05）',
      page: 'formula-calc',
      color: 'from-indigo-500 to-blue-600',
    },
    {
      icon: <BarChart3 size={22} />,
      title: '情景分析',
      desc: '多情景并行对比决策（M07）',
      page: 'scenario',
      color: 'from-teal-500 to-green-600',
    },
    {
      icon: <Database size={22} />,
      title: '数据管理',
      desc: '导入导出与数据库连接',
      page: 'data-management',
      color: 'from-gray-600 to-slate-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-200">
              <FlaskConical size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">皇氏乳业配方计算器</h1>
              <p className="text-xs text-gray-400">Formula Optimization System v2.0</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage('data-management')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Database size={15} />
              数据管理
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: '营养指标', value: nutrients.length, icon: <TrendingUp size={16} />, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: '原料种类', value: materials.filter(m => m.isActive).length, icon: <Package size={16} />, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: '在库批次', value: batches.length, icon: <ClipboardList size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: '生效配方', value: activeForms.length, icon: <CheckCircle2 size={16} />, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                {stat.icon}
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alert for expiring batches */}
        {expiringBatches.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-amber-900">
                {expiringBatches.length} 个批次即将到期（7天内）
              </div>
              <div className="text-sm text-amber-700 mt-1">
                {expiringBatches.map(b => `${b.materialName}(${b.batchCode})`).join('、')}
              </div>
            </div>
            <button
              onClick={() => setCurrentPage('batches')}
              className="text-amber-700 text-sm font-medium hover:text-amber-900 flex items-center gap-1"
            >
              查看 <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Module Grid */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">功能模块</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map((mod) => (
            <button
              key={mod.page}
              onClick={() => setCurrentPage(mod.page)}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:shadow-md hover:border-blue-200 transition-all duration-200 relative overflow-hidden"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-200`}>
                {mod.icon}
              </div>
              <div className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                {mod.title}
                {mod.tag && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                    {mod.tag}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 mb-3">{mod.desc}</div>
              {mod.stats && (
                <div className="text-xs text-gray-400 font-medium">{mod.stats}</div>
              )}
              <ArrowRight
                size={16}
                className="absolute bottom-4 right-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all duration-200"
              />
            </button>
          ))}
        </div>

        {/* Quick Start Section */}
        <div className="mt-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">快速开始配方计算</h3>
              <p className="text-blue-100 text-sm mb-4">
                推荐流程：标准化计算 → 配方优化 → 情景对比 → 生成执行配方
              </p>
              <div className="flex items-center gap-2 text-sm text-blue-200">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">1</span>
                  原料标准化
                </div>
                <ArrowRight size={14} />
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">2</span>
                  配方优化
                </div>
                <ArrowRight size={14} />
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">3</span>
                  情景分析
                </div>
              </div>
            </div>
            <button
              onClick={() => setCurrentPage('standardization')}
              className="bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-sm flex items-center gap-2 flex-shrink-0"
            >
              开始计算 <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
