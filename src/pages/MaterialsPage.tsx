import { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Copy, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Material, MaterialNutrient } from '../types';
import type { StoreType } from '../store/useStore';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input, { Select, Textarea } from '../components/ui/Input';

const categoryOptions = [
  { value: 'base', label: '基料' },
  { value: 'stabilizer', label: '稳定剂' },
  { value: 'sweetener', label: '甜味剂' },
  { value: 'fortifier', label: '营养强化剂' },
  { value: 'flavoring', label: '香精香料' },
  { value: 'other', label: '其他' },
];
const categoryLabels: Record<string, string> = {
  base: '基料', stabilizer: '稳定剂', sweetener: '甜味剂',
  fortifier: '营养强化剂', flavoring: '香精香料', other: '其他',
};
const categoryColors: Record<string, 'blue' | 'green' | 'orange' | 'purple' | 'yellow' | 'gray'> = {
  base: 'blue', stabilizer: 'green', sweetener: 'orange',
  fortifier: 'purple', flavoring: 'yellow', other: 'gray',
};

function MaterialForm({
  initial, nutrients, onSave, onCancel
}: {
  initial?: Partial<Material>;
  nutrients: ReturnType<StoreType['state']['nutrients']['filter']>;
  onSave: (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const activeNutrients = nutrients.filter(n => n.status === 'active');
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    category: initial?.category ?? 'base' as Material['category'],
    unit: initial?.unit ?? 'kg',
    status: initial?.status ?? 'active' as Material['status'],
    remark: initial?.remark ?? '',
    stock: String(initial?.stock ?? 0),
    safeStock: String(initial?.safeStock ?? ''),
    unitCost: String(initial?.unitCost ?? 0),
    costUpdatedAt: initial?.costUpdatedAt ?? '',
    nutrientValues: Object.fromEntries(
      (initial?.nutrients ?? []).map(n => [n.nutrientId, String(n.value)])
    ) as Record<string, string>,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const setNut = (id: string, v: string) => setForm(f => ({ ...f, nutrientValues: { ...f.nutrientValues, [id]: v } }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = '请输入原材料名称';
    if (!form.unit.trim()) e.unit = '请输入计量单位';
    if (isNaN(parseFloat(form.stock))) e.stock = '请输入有效库存数量';
    if (isNaN(parseFloat(form.unitCost))) e.unitCost = '请输入有效单位成本';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const nutrientsList: MaterialNutrient[] = activeNutrients
      .map(n => ({ nutrientId: n.id, value: parseFloat(form.nutrientValues[n.id] ?? '0') || 0 }))
      .filter(n => n.value > 0);
    onSave({
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      category: form.category,
      unit: form.unit.trim(),
      status: form.status,
      remark: form.remark.trim() || undefined,
      stock: parseFloat(form.stock) || 0,
      safeStock: form.safeStock ? parseFloat(form.safeStock) : undefined,
      unitCost: parseFloat(form.unitCost) || 0,
      costUpdatedAt: form.costUpdatedAt || undefined,
      nutrients: nutrientsList,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <Input label="原材料名称" required value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} placeholder="如：生牛乳" className="col-span-2" />
        <Input label="原材料编码" value={form.code} onChange={e => set('code', e.target.value)} placeholder="如：RM001" />
        <Select label="原材料类别" value={form.category} onChange={e => set('category', e.target.value)} options={categoryOptions} />
        <Input label="计量单位" required value={form.unit} onChange={e => set('unit', e.target.value)} error={errors.unit} placeholder="kg" />
        <Select label="状态" value={form.status} onChange={e => set('status', e.target.value as Material['status'])} options={[{ value: 'active', label: '可用' }, { value: 'disabled', label: '禁用' }]} />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">库存与成本</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="当前库存" required type="number" value={form.stock} onChange={e => set('stock', e.target.value)} error={errors.stock} suffix={form.unit || 'kg'} />
          <Input label="安全库存线" type="number" value={form.safeStock} onChange={e => set('safeStock', e.target.value)} hint="低于此值时显示预警" suffix={form.unit || 'kg'} />
          <Input label="单位成本" required type="number" value={form.unitCost} onChange={e => set('unitCost', e.target.value)} error={errors.unitCost} suffix={`元/${form.unit || 'kg'}`} />
          <Input label="成本更新日期" type="date" value={form.costUpdatedAt} onChange={e => set('costUpdatedAt', e.target.value)} />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">营养物质含量</h3>
        <p className="text-xs text-gray-400 mb-3">从全局营养字典中填写，空白或0表示不含该营养（计算时默认为0）</p>
        {activeNutrients.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">尚未配置全局营养物质，请先前往「全局营养管理」添加</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {activeNutrients.map(n => (
              <div key={n.id} className="flex items-center gap-2">
                <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{n.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    step="0.01"
                    value={form.nutrientValues[n.id] ?? ''}
                    onChange={e => setNut(n.id, e.target.value)}
                    placeholder="0"
                    className="w-20 text-right px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                  />
                  <span className="text-xs text-gray-400 w-16 truncate">{n.unit}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Textarea label="备注" value={form.remark} onChange={e => set('remark', e.target.value)} placeholder="供应商、储存条件等补充说明" rows={2} />

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" onClick={onCancel}>取消</Button>
        <Button variant="primary" onClick={handleSave}>保存</Button>
      </div>
    </div>
  );
}

interface Props { store: StoreType; }

export default function MaterialsPage({ store }: Props) {
  const { state, addMaterial, updateMaterial, deleteMaterial, duplicateMaterial } = store;
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Material | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Material | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return state.materials.filter(m => {
      if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !(m.code?.toLowerCase().includes(search.toLowerCase()))) return false;
      if (filterCat !== 'all' && m.category !== filterCat) return false;
      if (filterStatus !== 'all' && m.status !== filterStatus) return false;
      return true;
    });
  }, [state.materials, search, filterCat, filterStatus]);

  const isLowStock = (m: Material) => m.safeStock !== undefined && m.stock < m.safeStock;

  const openAdd = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit = (m: Material) => { setEditTarget(m); setModalOpen(true); };

  const handleSave = (data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editTarget) updateMaterial(editTarget.id, data);
    else addMaterial(data);
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const err = deleteMaterial(deleteConfirm.id);
    if (err) setDeleteError(err);
    else { setDeleteConfirm(null); setDeleteError(''); }
  };

  const toggleStatus = (m: Material) => {
    updateMaterial(m.id, { status: m.status === 'active' ? 'disabled' : 'active' });
  };

  const lowStockCount = state.materials.filter(isLowStock).length;

  const getNutrientName = (id: string) => state.nutrients.find(n => n.id === id)?.name ?? id;
  const getNutrientUnit = (id: string) => state.nutrients.find(n => n.id === id)?.unit ?? '';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">原材料管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理所有原材料基础信息、库存与营养成分含量</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={openAdd}>添加原材料</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '全部原料', value: state.materials.length, sub: '种', color: 'bg-blue-50 text-blue-700' },
          { label: '可用', value: state.materials.filter(m => m.status === 'active').length, sub: '种', color: 'bg-emerald-50 text-emerald-700' },
          { label: '禁用', value: state.materials.filter(m => m.status === 'disabled').length, sub: '种', color: 'bg-gray-50 text-gray-500' },
          { label: '库存预警', value: lowStockCount, sub: '种', color: lowStockCount > 0 ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-400' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color} flex items-center justify-between`}>
            <span className="text-sm font-medium">{s.label}</span>
            <span className="text-2xl font-bold">{s.value}<span className="text-sm font-normal ml-1">{s.sub}</span></span>
          </div>
        ))}
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-sm">
          <AlertTriangle size={16} className="shrink-0" />
          <span>有 <strong>{lowStockCount}</strong> 种原料库存低于安全线，请及时补货</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="搜索名称或编码..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 bg-white" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">全部类别</option>
          {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 bg-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">全部状态</option>
          <option value="active">可用</option>
          <option value="disabled">禁用</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">名称 / 编码</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">类别</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">库存</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">单位成本</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">状态</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">暂无原材料数据</td></tr>
            )}
            {filtered.map(m => (
              <>
                <tr key={m.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${m.status === 'disabled' ? 'opacity-60' : ''} ${isLowStock(m) ? 'bg-orange-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isLowStock(m) && <AlertTriangle size={14} className="text-orange-500 shrink-0" />}
                      <div>
                        <div className="font-medium text-gray-900">{m.name}</div>
                        {m.code && <div className="text-xs text-gray-400 font-mono">{m.code}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={categoryColors[m.category]}>{categoryLabels[m.category]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className={`font-medium ${isLowStock(m) ? 'text-orange-600' : 'text-gray-900'}`}>
                      {m.stock.toFixed(1)} {m.unit}
                    </div>
                    {m.safeStock !== undefined && (
                      <div className="text-xs text-gray-400">安全线: {m.safeStock} {m.unit}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">¥{m.unitCost.toFixed(2)}<span className="text-xs text-gray-400">/{m.unit}</span></td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleStatus(m)} className="flex items-center gap-1.5">
                      {m.status === 'active' ? (
                        <><ToggleRight size={20} className="text-emerald-500" /><span className="text-xs text-emerald-600">可用</span></>
                      ) : (
                        <><ToggleLeft size={20} className="text-gray-400" /><span className="text-xs text-gray-400">禁用</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setExpandedId(expandedId === m.id ? null : m.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        {expandedId === m.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <Button size="xs" variant="ghost" icon={<Copy size={13} />} onClick={() => duplicateMaterial(m.id)}>复制</Button>
                      <Button size="xs" variant="ghost" icon={<Edit2 size={13} />} onClick={() => openEdit(m)}>编辑</Button>
                      <Button size="xs" variant="ghost" icon={<Trash2 size={13} />} className="text-red-500 hover:bg-red-50" onClick={() => { setDeleteConfirm(m); setDeleteError(''); }}>删除</Button>
                    </div>
                  </td>
                </tr>
                {expandedId === m.id && (
                  <tr key={`${m.id}-expanded`} className="bg-blue-50/30 border-b border-gray-100">
                    <td colSpan={6} className="px-8 py-4">
                      <div className="flex gap-8">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">营养成分含量</p>
                          {m.nutrients.length === 0 ? (
                            <p className="text-sm text-gray-400">暂未录入营养成分</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-x-8 gap-y-1">
                              {m.nutrients.map(mn => (
                                <div key={mn.nutrientId} className="flex items-center justify-between gap-3 text-sm">
                                  <span className="text-gray-600">{getNutrientName(mn.nutrientId)}</span>
                                  <span className="font-mono text-gray-800">{mn.value} <span className="text-gray-400 text-xs">{getNutrientUnit(mn.nutrientId)}</span></span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {m.remark && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">备注</p>
                            <p className="text-sm text-gray-600">{m.remark}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? '编辑原材料' : '添加原材料'} size="xl">
        <MaterialForm initial={editTarget || undefined} nutrients={state.nutrients} onSave={handleSave} onCancel={() => setModalOpen(false)} />
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => { setDeleteConfirm(null); setDeleteError(''); }} title="删除原材料" size="sm">
        <div className="flex flex-col gap-4">
          {deleteError ? (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700">{deleteError}</div>
          ) : (
            <p className="text-gray-700">确定要删除原材料「<strong>{deleteConfirm?.name}</strong>」吗？</p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setDeleteConfirm(null); setDeleteError(''); }}>{deleteError ? '关闭' : '取消'}</Button>
            {!deleteError && <Button variant="danger" onClick={handleDelete}>确认删除</Button>}
          </div>
        </div>
      </Modal>
    </div>
  );
}
