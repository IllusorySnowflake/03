import { useState } from 'react';
import { Plus, Edit2, Trash2, Search, FlaskConical } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Nutrient } from '../../types';
import { Card, CardBody, CardHeader } from '../shared/Card';
import { Modal } from '../shared/Modal';
import { Badge } from '../shared/Badge';
import { PageHeader } from '../layout/PageHeader';

const categoryOptions = [
  { value: 'macronutrient', label: '宏量营养素' },
  { value: 'vitamin', label: '维生素' },
  { value: 'mineral', label: '矿物质' },
  { value: 'other', label: '其他' },
];

const categoryBadge: Record<string, { label: string; variant: 'blue' | 'green' | 'orange' | 'gray' }> = {
  macronutrient: { label: '宏量营养素', variant: 'blue' },
  vitamin: { label: '维生素', variant: 'green' },
  mineral: { label: '矿物质', variant: 'orange' },
  other: { label: '其他', variant: 'gray' },
};

function NutrientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Nutrient;
  onSave: (n: Nutrient) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Nutrient>(
    initial ?? {
      id: `nut-${Date.now()}`,
      name: '',
      unit: 'g/100g',
      category: 'macronutrient',
      decimalPlaces: 2,
      description: '',
    }
  );

  const set = (field: keyof Nutrient, value: unknown) =>
    setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">指标名称 *</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="如：脂肪"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">单位 *</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.unit}
            onChange={e => set('unit', e.target.value)}
            placeholder="如：g/100g"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">分类 *</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.category}
            onChange={e => set('category', e.target.value)}
          >
            {categoryOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">小数位数</label>
          <input
            type="number"
            min={0}
            max={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.decimalPlaces}
            onChange={e => set('decimalPlaces', parseInt(e.target.value))}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">描述</label>
        <textarea
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
          value={form.description ?? ''}
          onChange={e => set('description', e.target.value)}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => form.name && form.unit && onSave(form)}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          保存
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
}

export function NutrientsPage() {
  const { nutrients, addNutrient, updateNutrient, deleteNutrient } = useStore();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const filtered = nutrients.filter(n =>
    n.name.includes(search) || n.unit.includes(search)
  );

  return (
    <div className="flex-1 p-6">
      <PageHeader
        icon={<FlaskConical size={20} className="text-white" />}
        iconBg="from-violet-500 to-purple-600"
        title="全局营养字典"
        subtitle="定义全系统共用的营养指标，所有模块以此为唯一命名来源"
        action={
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> 新增指标
          </button>
        }
      />

      <div className="max-w-5xl">
        {/* Search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="搜索营养指标..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <Card>
          <CardHeader>
            <div className="text-sm font-medium text-gray-500">共 {filtered.length} 个指标</div>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">名称</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">单位</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">分类</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">小数位</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">描述</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(n => (
                  <tr key={n.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{n.name}</td>
                    <td className="px-4 py-3 font-mono text-gray-600 text-xs">{n.unit}</td>
                    <td className="px-4 py-3">
                      <Badge variant={categoryBadge[n.category]?.variant ?? 'gray'}>
                        {categoryBadge[n.category]?.label ?? n.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{n.decimalPlaces}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{n.description}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditingId(n.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteNutrient(n.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-400 py-10">暂无数据</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="新增营养指标">
        <NutrientForm
          onSave={n => { addNutrient(n); setIsAdding(false); }}
          onCancel={() => setIsAdding(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editingId}
        onClose={() => setEditingId(null)}
        title="编辑营养指标"
      >
        {editingId && (
          <NutrientForm
            initial={nutrients.find(n => n.id === editingId)}
            onSave={n => { updateNutrient(n); setEditingId(null); }}
            onCancel={() => setEditingId(null)}
          />
        )}
      </Modal>
    </div>
  );
}
