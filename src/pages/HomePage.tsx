import { useState, useRef } from 'react';
import {
  Beaker, Package, BookOpen, Calculator, AlertTriangle, Clock,
  Database, Upload, Download, RefreshCw, CheckCircle, XCircle, Wifi, WifiOff,
  TrendingUp, Activity
} from 'lucide-react';
import type { StoreType } from '../store/useStore';
import type { PageName, DBConfig } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input, { Select } from '../components/ui/Input';
import Badge from '../components/ui/Badge';

interface Props {
  store: StoreType;
  setPage: (p: PageName) => void;
}

function DBConfigModal({ dbConfig, onSave, onClose }: {
  dbConfig: DBConfig;
  onSave: (c: DBConfig) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    type: dbConfig.type,
    connectionString: dbConfig.connectionString ?? '',
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <p className="font-semibold mb-1">💡 说明</p>
        <p>当前版本数据存储在浏览器本地（localStorage），数据在清除浏览器缓存后可能丢失。配置远程数据库后可实现多端同步与持久化存储。</p>
      </div>

      <div className="p-3 rounded-xl border flex items-center gap-3 text-sm">
        {dbConfig.type === 'local' ? (
          <><WifiOff size={16} className="text-gray-400" /><span className="text-gray-600">当前模式：<strong>本地存储</strong>（浏览器 localStorage）</span></>
        ) : (
          <><Wifi size={16} className="text-emerald-500" /><span className="text-emerald-700">当前模式：<strong>远程数据库</strong>（{dbConfig.connectionString}）</span></>
        )}
        {dbConfig.lastSyncAt && <span className="text-xs text-gray-400 ml-auto">上次同步：{new Date(dbConfig.lastSyncAt).toLocaleString('zh-CN')}</span>}
      </div>

      <Select
        label="存储模式"
        value={form.type}
        onChange={e => setForm(f => ({ ...f, type: e.target.value as DBConfig['type'] }))}
        options={[
          { value: 'local', label: '本地存储（浏览器）' },
          { value: 'remote', label: '远程数据库' },
        ]}
      />

      {form.type === 'remote' && (
        <Input
          label="数据库连接地址"
          value={form.connectionString}
          onChange={e => setForm(f => ({ ...f, connectionString: e.target.value }))}
          placeholder="如：http://your-server/api/dairy-db"
          hint="支持 RESTful API 端点或 WebSocket 地址"
        />
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={() => { onSave(form); onClose(); }}>保存配置</Button>
      </div>
    </div>
  );
}

function DataIOModal({ store, onClose }: { store: StoreType; onClose: () => void }) {
  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const err = store.importData(ev.target?.result as string);
      if (err) setImportResult({ ok: false, msg: err });
      else setImportResult({ ok: true, msg: '数据导入成功，所有数据已更新' });
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📤 导出数据</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" icon={<Download size={14} />} onClick={store.exportData} className="justify-start">
            导出全部数据（JSON）
          </Button>
          <Button variant="secondary" icon={<Download size={14} />} onClick={() => store.exportModule('nutrients')} className="justify-start">
            仅导出营养字典
          </Button>
          <Button variant="secondary" icon={<Download size={14} />} onClick={() => store.exportModule('materials')} className="justify-start">
            仅导出原材料库
          </Button>
          <Button variant="secondary" icon={<Download size={14} />} onClick={() => store.exportModule('formulas')} className="justify-start">
            仅导出产品配方库
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📥 导入数据</h3>
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
          <Upload size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">点击选择导出的 JSON 文件</p>
          <p className="text-xs text-gray-400 mt-1">导入将覆盖现有数据，请确认后操作</p>
        </div>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

        {importResult && (
          <div className={`mt-3 p-3 rounded-xl flex items-center gap-2 text-sm ${importResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {importResult.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {importResult.msg}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">⚠ 重置数据</h3>
        <Button variant="danger" size="sm" icon={<RefreshCw size={13} />} onClick={() => {
          if (confirm('确定要重置为出厂默认数据吗？所有自定义数据将丢失！')) {
            store.resetToDefault();
            onClose();
          }
        }}>
          重置为默认数据
        </Button>
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onClose}>关闭</Button>
      </div>
    </div>
  );
}

export default function HomePage({ store, setPage }: Props) {
  const { state, dbConfig, saveDbConfig } = store;
  const [dbModal, setDbModal] = useState(false);
  const [dataModal, setDataModal] = useState(false);

  const lowStockMaterials = state.materials.filter(m => m.safeStock !== undefined && m.stock < m.safeStock);
  const recentCalcs = state.calculationHistory.slice(0, 5);

  const quickCards = [
    {
      icon: <Beaker size={24} />,
      label: '全局营养管理',
      desc: '管理营养物质字典',
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50 hover:bg-blue-100',
      textColor: 'text-blue-700',
      page: 'nutrients' as PageName,
      count: `${state.nutrients.filter(n => n.status === 'active').length} 个启用`,
    },
    {
      icon: <Package size={24} />,
      label: '原材料管理',
      desc: '管理原料库存与成本',
      color: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50 hover:bg-emerald-100',
      textColor: 'text-emerald-700',
      page: 'materials' as PageName,
      count: `${state.materials.filter(m => m.status === 'active').length} 种可用`,
    },
    {
      icon: <BookOpen size={24} />,
      label: '产品配方管理',
      desc: '配方设计与版本管理',
      color: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-50 hover:bg-purple-100',
      textColor: 'text-purple-700',
      page: 'formulas' as PageName,
      count: `${state.formulas.filter(f => f.status === 'active').length} 个生效`,
    },
    {
      icon: <Calculator size={24} />,
      label: '配方计算引擎',
      desc: '单纯形法LP智能优化',
      color: 'from-orange-500 to-orange-600',
      bg: 'bg-orange-50 hover:bg-orange-100',
      textColor: 'text-orange-700',
      page: 'calculator' as PageName,
      count: `${state.calculationHistory.length} 次计算`,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-8 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-12 w-32 h-32 rounded-full border-4 border-white" />
          <div className="absolute -bottom-8 right-32 w-48 h-48 rounded-full border-4 border-white" />
          <div className="absolute top-2 right-48 w-16 h-16 rounded-full border-2 border-white" />
        </div>
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🥛</span>
                <div>
                  <h1 className="text-3xl font-bold">皇氏乳业配料计算器</h1>
                  <p className="text-blue-200 text-sm mt-0.5">Dairy Formula Optimizer v1.0</p>
                </div>
              </div>
              <p className="text-blue-100 mt-3 max-w-lg leading-relaxed">
                基于线性规划（单纯形法）的智能配方优化系统，实现营养约束下的最优配比计算，替代人工反复试算
              </p>
              <div className="flex gap-3 mt-5">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-blue-700 hover:bg-blue-50 border-0"
                  icon={<Calculator size={18} />}
                  onClick={() => setPage('calculator')}
                >
                  开始计算
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="text-white hover:bg-white/20 border border-white/30"
                  icon={<Database size={18} />}
                  onClick={() => setDbModal(true)}
                >
                  数据库配置
                </Button>
              </div>
            </div>
            <div className="hidden lg:flex flex-col items-end gap-2">
              <div className="text-right">
                <p className="text-4xl font-bold">{state.calculationHistory.filter(c => c.status === 'success').length}</p>
                <p className="text-blue-200 text-sm">成功计算次数</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {lowStockMaterials.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-2xl cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => setPage('materials')}>
          <AlertTriangle size={18} className="text-orange-500 shrink-0" />
          <div className="flex-1 text-sm text-orange-700">
            <strong>{lowStockMaterials.length}</strong> 种原料库存低于安全线：
            {lowStockMaterials.slice(0, 3).map(m => m.name).join('、')}
            {lowStockMaterials.length > 3 && ` 等`}
          </div>
          <span className="text-orange-500 text-xs">点击查看 →</span>
        </div>
      )}

      {/* Quick cards */}
      <div className="grid grid-cols-4 gap-4">
        {quickCards.map(c => (
          <button key={c.page} onClick={() => setPage(c.page)} className={`${c.bg} rounded-2xl p-5 text-left transition-all hover:shadow-md group`}>
            <div className={`${c.textColor} mb-3`}>{c.icon}</div>
            <h3 className={`font-bold text-base ${c.textColor}`}>{c.label}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{c.desc}</p>
            <p className={`text-xs font-medium mt-2 ${c.textColor} opacity-70`}>{c.count}</p>
          </button>
        ))}
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-5">
        {/* Data overview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-blue-500" />
            <h3 className="font-semibold text-gray-800">数据概览</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: '营养物质', total: state.nutrients.length, active: state.nutrients.filter(n => n.status === 'active').length, unit: '个', color: 'blue' },
              { label: '原材料', total: state.materials.length, active: state.materials.filter(m => m.status === 'active').length, unit: '种', color: 'emerald' },
              { label: '产品配方', total: state.formulas.length, active: state.formulas.filter(f => f.status === 'active').length, unit: '个', color: 'purple' },
              { label: '计算记录', total: state.calculationHistory.length, active: state.calculationHistory.filter(c => c.status === 'success').length, unit: '次', color: 'orange' },
            ].map(s => (
              <div key={s.label} className="flex flex-col gap-1">
                <span className="text-xs text-gray-500">{s.label}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{s.total}</span>
                  <span className="text-xs text-gray-400">{s.unit}</span>
                </div>
                <span className="text-xs text-gray-400">其中 {s.active} 个启用</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent calculations */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-blue-500" />
            <h3 className="font-semibold text-gray-800">近期计算记录</h3>
            <button onClick={() => setPage('calculator')} className="ml-auto text-xs text-blue-600 hover:underline">前往计算 →</button>
          </div>
          {recentCalcs.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <TrendingUp size={28} className="mx-auto mb-2 opacity-30" />
              暂无计算记录
            </div>
          ) : (
            <div className="space-y-3">
              {recentCalcs.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  {c.status === 'success' ? (
                    <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.formulaName}</p>
                    <p className="text-xs text-gray-400">{c.targetYield} kg · {new Date(c.calculatedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  {c.status === 'success' && (
                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full shrink-0">¥{c.totalCost.toFixed(0)}</span>
                  )}
                  {c.status !== 'success' && (
                    <Badge color="red">无解</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Data management */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-blue-500" />
            <h3 className="font-semibold text-gray-800">数据管理</h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {dbConfig.type === 'remote' ? (
              <span className="flex items-center gap-1 text-emerald-600"><Wifi size={14} />已连接远程数据库</span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400"><WifiOff size={14} />本地存储模式</span>
            )}
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="secondary" icon={<Database size={14} />} onClick={() => setDbModal(true)}>数据库配置</Button>
          <Button variant="secondary" icon={<Download size={14} />} onClick={() => setDataModal(true)}>数据导出/导入</Button>
        </div>
      </div>

      {/* DB Config Modal */}
      <Modal open={dbModal} onClose={() => setDbModal(false)} title="数据库配置" size="md">
        <DBConfigModal dbConfig={dbConfig} onSave={saveDbConfig} onClose={() => setDbModal(false)} />
      </Modal>

      {/* Data IO Modal */}
      <Modal open={dataModal} onClose={() => setDataModal(false)} title="数据导入 / 导出" size="lg">
        <DataIOModal store={store} onClose={() => setDataModal(false)} />
      </Modal>
    </div>
  );
}
