import { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Package, ChevronDown, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Material, MaterialType, SafetyMarginMode } from '../../types';
import { Card, CardBody, CardHeader } from '../shared/Card';
import { Modal } from '../shared/Modal';
import { Badge } from '../shared/Badge';
import { PageHeader } from '../layout/PageHeader';

const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: 'RAW_MILK', label: '生牛乳' },
  { value: 'CREAM', label: '稀奶油' },
  { value: 'SKIM_MILK', label: '脱脂乳' },
  { value: 'MILK_POWDER', label: '全脂奶粉' },
  { value: 'SKIM_MILK_POWDER', label: '脱脂奶粉' },
  { value: 'WHEY_PROTEIN', label: '乳清蛋白粉' },
  { value: 'SUGAR', label: '白砂糖' },
  { value: 'STABILIZER', label: '稳定剂' },
  { value: 'VITAMIN', label: '维生素' },
  { value: 'MINERAL', label: '矿物质' },
  { value: 'OTHER', label: '其他' },
];

const typeColor: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'gray'> = {
  RAW_MILK: 'blue',
  CREAM: 'yellow' as 'orange',
  SKIM_MILK: 'green',
  MILK_POWDER: 'purple',
  SKIM_MILK_POWDER: 'purple',
  WHEY_PROTEIN: 'orange',
  SUGAR: 'gray',
  STABILIZER: 'gray',
  VITAMIN: 'green',
  MINERAL: 'orange',
  OTHER: 'gray',
};

function MaterialForm({ initial, onSave, onCancel }: {
  initial?: Material;
  onSave: (m: Material) => void;
  onCancel: () => void;
}) {
  const { nutrients } = useStore();
  const [form, setForm] = useState<Material>(initial ?? {
    id: `mat-${Date.now()}`,
    name: '',
    code: '',
    type: 'RAW_MILK',
    unit: 'kg',
    defaultPrice: 0,
    nutrients: [],
    safetyMarginConfig: { mode: 'POINT', kFactor: 0 },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const setField = (k: keyof Material, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const setNutValue = (nutId: string, value: number) => {
    setForm(p => {
      const existing = p.nutrients.find(n => n.nutrientId === nutId);
      if (existing) {
        return { ...p, nutrients: p.nutrients.map(n => n.nutrientId === nutId ? { ...n, value } : n) };
      }
      return { ...p, nutrients: [...p.nutrients, { nutrientId: nutId, value }] };
    });
  };

  const macros = nutrients.filter(n => n.category === 'macronutrient');
  const others = nutrients.filter(n => n.category !== 'macronutrient');

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">原料名称 *</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.name} onChange={e => setField('name', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">编码 *</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.code} onChange={e => setField('code', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">类型</label>
          <select className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.type} onChange={e => setField('type', e.target.value)}>
            {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">默认价格（元/kg）</label>
          <input type="number" step="0.01" className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.defaultPrice} onChange={e => setField('defaultPrice', parseFloat(e.target.value))} />
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-600 mb-2 border-t pt-3">营养含量（per 100g）</div>
        <div className="grid grid-cols-2 gap-2">
          {[...macros, ...others].map(n => {
            const existing = form.nutrients.find(fn => fn.nutrientId === n.id);
            return (
              <div key={n.id} className="flex items-center gap-2">
                <label className="text-xs text-gray-600 w-24 flex-shrink-0">{n.name}</label>
                <input
                  type="number" step="0.01"
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={existing?.value ?? 0}
                  onChange={e => setNutValue(n.id, parseFloat(e.target.value) || 0)}
                />
                <span className="text-xs text-gray-400 w-16 flex-shrink-0">{n.unit}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-gray-600 mb-2 border-t pt-3">安全裕量配置</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">计算模式</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.safetyMarginConfig.mode}
              onChange={e => setField('safetyMarginConfig', { ...form.safetyMarginConfig, mode: e.target.value as SafetyMarginMode })}
            >
              <option value="POINT">点估计（直接使用检测值）</option>
              <option value="CONSERVATIVE">保守估计（检测值-k×标准差）</option>
              <option value="BATCH_AVG">近N批次均值</option>
            </select>
          </div>
          {form.safetyMarginConfig.mode === 'CONSERVATIVE' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">k 系数</label>
              <input type="number" step="0.1" min="0" max="3"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.safetyMarginConfig.kFactor}
                onChange={e => setField('safetyMarginConfig', { ...form.safetyMarginConfig, kFactor: parseFloat(e.target.value) })}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={() => form.name && onSave({ ...form, updatedAt: new Date().toISOString() })}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
          保存
        </button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200 transition-colors">
          取消
        </button>
      </div>
    </div>
  );
}

export function MaterialsPage() {
  const { materials, nutrients, addMaterial, updateMaterial, deleteMaterial } = useStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const filtered = materials.filter(m => {
    const matchSearch = m.name.includes(search) || m.code.includes(search);
    const matchType = typeFilter === 'ALL' || m.type === typeFilter;
    return matchSearch && matchType;
  });

  const getTypeName = (type: string) => MATERIAL_TYPES.find(t => t.value === type)?.label ?? type;

  return (
    <div className="flex-1 p-6">
      <PageHeader
        icon={<Package size={20} className="text-white" />}
        iconBg="from-blue-500 to-cyan-600"
        title="原材料主数据"
        subtitle="管理原料的基础属性与营养信息，与具体批次数据分离"
        action={
          <button onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> 新增原料
          </button>
        }
      />

      <div className="max-w-6xl">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="搜索原料名称或编码..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="ALL">全部类型</option>
            {MATERIAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <Card>
          <CardHeader>
            <span className="text-sm font-medium text-gray-500">共 {filtered.length} 种原料</span>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-8"></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">名称</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">编码</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">类型</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">默认价格</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">安全裕量</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <>
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                          className="text-gray-400 hover:text-gray-600">
                          {expandedId === m.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                      <td className="px-4 py-3 font-mono text-gray-500 text-xs">{m.code}</td>
                      <td className="px-4 py-3">
                        <Badge variant={typeColor[m.type] as 'blue' | 'green' | 'purple' | 'orange' | 'gray'}>
                          {getTypeName(m.type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-700">¥{m.defaultPrice.toFixed(2)}/kg</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {m.safetyMarginConfig.mode === 'POINT' ? '点估计' :
                          m.safetyMarginConfig.mode === 'CONSERVATIVE' ? `保守(k=${m.safetyMarginConfig.kFactor})` : '批次均值'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setEditingId(m.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => deleteMaterial(m.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === m.id && (
                      <tr key={`${m.id}-exp`} className="bg-blue-50/50">
                        <td colSpan={7} className="px-8 py-4">
                          <div className="text-xs font-semibold text-gray-500 mb-2">营养含量（per 100g）</div>
                          <div className="flex flex-wrap gap-3">
                            {m.nutrients.map(mn => {
                              const nut = nutrients.find(n => n.id === mn.nutrientId);
                              return (
                                <div key={mn.nutrientId} className="bg-white rounded-lg px-3 py-2 border border-gray-100 text-xs">
                                  <span className="text-gray-500">{nut?.name ?? mn.nutrientId}: </span>
                                  <span className="font-semibold text-gray-900">{mn.value}</span>
                                  <span className="text-gray-400 ml-1">{nut?.unit}</span>
                                  {mn.historicalStdDev !== undefined && (
                                    <span className="text-gray-400"> ±{mn.historicalStdDev}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="新增原料" size="xl">
        <MaterialForm onSave={m => { addMaterial(m); setIsAdding(false); }} onCancel={() => setIsAdding(false)} />
      </Modal>
      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="编辑原料" size="xl">
        {editingId && (
          <MaterialForm
            initial={materials.find(m => m.id === editingId)}
            onSave={m => { updateMaterial(m); setEditingId(null); }}
            onCancel={() => setEditingId(null)}
          />
        )}
      </Modal>
    </div>
  );
}
