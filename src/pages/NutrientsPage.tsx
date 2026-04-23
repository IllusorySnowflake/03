import { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, ChevronUp, ChevronDown } from 'lucide-react';
import type { Nutrient } from '../types';
import type { StoreType } from '../store/useStore';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input, { Select, Textarea } from '../components/ui/Input';

const categoryOptions = [
  { value: 'common', label: '常规营养素' },
  { value: 'physical', label: '物理指标' },
  { value: 'microbial', label: '微生物指标' },
  { value: 'other', label: '其他' },
];

const categoryColors: Record<string, 'blue' | 'green' | 'orange' | 'gray'> = {
  common: 'blue',
  physical: 'green',
  microbial: 'orange',
  other: 'gray',
};

const categoryLabels: Record<string, string> = {
  common: '常规营养素',
  physical: '物理指标',
  microbial: '微生物指标',
  other: '其他',
};

function NutrientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Nutrient>;
  onSave: (data: Omit<Nutrient, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    unit: initial?.unit ?? 'g/100g',
    category: initial?.category ?? 'common' as Nutrient['category'],
    remark: initial?.remark ?? '',
    status: initial?.status ?? 'active' as Nutrient['status'],
    sortOrder: initial?.sortOrder ?? 99,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = '请输入营养物质名称';
    if (!form.unit.trim()) e.unit = '请输入计量单位';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      unit: form.unit.trim(),
      category: form.category,
      remark: form.remark.trim() || undefined,
      status: form.status,
      sortOrder: form.sortOrder,
    });
  };

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="flex flex-col gap-4">
      <Input label="营养物质名称" required value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} placeholder="如：蛋白质、脂肪、乳糖" />
      <Input label="计量单位" required value={form.unit} onChange={e => set('unit', e.target.value)} error={errors.unit} placeholder="如：g/100g、%、°T、mg/100g" />
      <Select label="营养类别" value={form.category} onChange={e => set('category', e.target.value)} options={categoryOptions} />
      <Textarea label="备注说明" value={form.remark} onChange={e => set('remark', e.target.value)} placeholder="可填写测定方法、引用标准等说明" rows={3} />
      <div className="flex gap-4 pt-2 border-t border-gray-100 justify-end">
        <Button variant="secondary" onClick={onCancel}>取消</Button>
        <Button variant="primary" onClick={handleSave}>保存</Button>
      </div>
    </div>
  );
}

interface Props {
  store: StoreType;
}

export default function NutrientsPage({ store }: Props) {
  const { state, addNutrient, updateNutrient, deleteNutrient, reorderNutrients } = store;
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Nutrient | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Nutrient | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const filtered = useMemo(() => {
    return state.nutrients.filter(n => {
      if (search && !n.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== 'all' && n.category !== filterCategory) return false;
      if (filterStatus !== 'all' && n.status !== filterStatus) return false;
      return true;
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [state.nutrients, search, filterCategory, filterStatus]);

  const openAdd = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit = (n: Nutrient) => { setEditTarget(n); setModalOpen(true); };

  const handleSave = (data: Omit<Nutrient, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editTarget) {
      updateNutrient(editTarget.id, data);
    } else {
      addNutrient({ ...data, sortOrder: state.nutrients.length + 1 });
    }
    setModalOpen(false);
  };

  const handleToggleStatus = (n: Nutrient) => {
    updateNutrient(n.id, { status: n.status === 'active' ? 'disabled' : 'active' });
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const err = deleteNutrient(deleteConfirm.id);
    if (err) {
      setDeleteError(err);
    } else {
      setDeleteConfirm(null);
      setDeleteError('');
    }
  };

  const moveNutrient = (id: string, dir: 'up' | 'down') => {
    const sorted = [...state.nutrients].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(n => n.id === id);
    if (dir === 'up' && idx > 0) {
      [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
    } else if (dir === 'down' && idx < sorted.length - 1) {
      [sorted[idx + 1], sorted[idx]] = [sorted[idx], sorted[idx + 1]];
    }
    const reordered = sorted.map((n, i) => ({ ...n, sortOrder: i + 1 }));
    reorderNutrients(reordered);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">全局营养物质管理</h1>
          <p className="text-sm text-gray-500 mt-1">统一定义营养物质字典，供原材料和配方引用，避免命名不一致</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openAdd}>添加营养物质</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '全部', value: state.nutrients.length, color: 'bg-blue-50 text-blue-700' },
          { label: '启用', value: state.nutrients.filter(n => n.status === 'active').length, color: 'bg-emerald-50 text-emerald-700' },
          { label: '禁用', value: state.nutrients.filter(n => n.status === 'disabled').length, color: 'bg-gray-50 text-gray-500' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color} flex items-center justify-between`}>
            <span className="text-sm font-medium">{s.label}</span>
            <span className="text-2xl font-bold">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="搜索营养物质名称..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 bg-white"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="all">全部类别</option>
          {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          className="px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 bg-white"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="all">全部状态</option>
          <option value="active">启用</option>
          <option value="disabled">禁用</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">排序</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">营养物质名称</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">计量单位</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">类别</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">备注</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">状态</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  {search || filterCategory !== 'all' || filterStatus !== 'all' ? '没有符合条件的营养物质' : '暂无营养物质，点击「添加营养物质」开始添加'}
                </td>
              </tr>
            )}
            {filtered.map((n, idx) => (
              <tr key={n.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${n.status === 'disabled' ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveNutrient(n.id, 'up')} disabled={idx === 0} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-400">
                      <ChevronUp size={13} />
                    </button>
                    <button onClick={() => moveNutrient(n.id, 'down')} disabled={idx === filtered.length - 1} className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-400">
                      <ChevronDown size={13} />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{n.name}</td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{n.unit}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge color={categoryColors[n.category]}>{categoryLabels[n.category]}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-48 truncate">{n.remark || '-'}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggleStatus(n)} className="flex items-center gap-1.5 group">
                    {n.status === 'active' ? (
                      <><ToggleRight size={20} className="text-emerald-500" /><span className="text-xs text-emerald-600">启用</span></>
                    ) : (
                      <><ToggleLeft size={20} className="text-gray-400" /><span className="text-xs text-gray-400">禁用</span></>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="xs" variant="ghost" icon={<Edit2 size={13} />} onClick={() => openEdit(n)}>编辑</Button>
                    <Button size="xs" variant="ghost" icon={<Trash2 size={13} />} className="text-red-500 hover:bg-red-50" onClick={() => { setDeleteConfirm(n); setDeleteError(''); }}>删除</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? '编辑营养物质' : '添加营养物质'}>
        <NutrientForm
          initial={editTarget || undefined}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirm} onClose={() => { setDeleteConfirm(null); setDeleteError(''); }} title="删除营养物质" size="sm">
        <div className="flex flex-col gap-4">
          {deleteError ? (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700">{deleteError}</div>
          ) : (
            <p className="text-gray-700">确定要删除营养物质「<strong>{deleteConfirm?.name}</strong>」吗？此操作无法撤销。</p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setDeleteConfirm(null); setDeleteError(''); }}>
              {deleteError ? '关闭' : '取消'}
            </Button>
            {!deleteError && <Button variant="danger" onClick={handleDelete}>确认删除</Button>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
