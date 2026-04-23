import { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Copy, History, RotateCcw, GitCompare } from 'lucide-react';
import type { Formula, FormulaIngredient, FormulaNutrientConstraint, FormulaStatus } from '../types';
import type { StoreType } from '../store/useStore';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input, { Select, Textarea } from '../components/ui/Input';

const statusColors: Record<FormulaStatus, 'yellow' | 'emerald' | 'gray'> = {
  draft: 'yellow', active: 'emerald', disabled: 'gray',
};
const statusLabels: Record<FormulaStatus, string> = {
  draft: '草稿', active: '生效', disabled: '禁用',
};
const categoryOptions = [
  { value: '', label: '未分类' },
  { value: 'pure_milk', label: '纯牛奶' },
  { value: 'modified_milk', label: '调制乳' },
  { value: 'yogurt', label: '酸奶' },
  { value: 'milk_powder', label: '奶粉' },
  { value: 'cheese', label: '奶酪' },
  { value: 'other', label: '其他' },
];
const categoryLabels: Record<string, string> = {
  pure_milk: '纯牛奶', modified_milk: '调制乳', yogurt: '酸奶',
  milk_powder: '奶粉', cheese: '奶酪', other: '其他',
};

// ── Formula Form ───────────────────────────────────────────
function FormulaForm({
  initial, materials, nutrients, onSave, onCancel
}: {
  initial?: Partial<Formula>;
  materials: StoreType['state']['materials'];
  nutrients: StoreType['state']['nutrients'];
  onSave: (data: Omit<Formula, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion' | 'versions'>, summary: string) => void;
  onCancel: () => void;
}) {
  const activeMaterials = materials.filter(m => m.status === 'active');
  const activeNutrients = nutrients.filter(n => n.status === 'active');

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    category: initial?.category ?? '' as Formula['category'],
    status: initial?.status ?? 'draft' as FormulaStatus,
    defaultYield: String(initial?.defaultYield ?? 1000),
    remark: initial?.remark ?? '',
  });

  const [ingredients, setIngredients] = useState<FormulaIngredient[]>(
    initial?.ingredients ?? []
  );
  const [constraints, setConstraints] = useState<FormulaNutrientConstraint[]>(
    initial?.nutrientConstraints ?? []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleIngredient = (mid: string) => {
    setIngredients(prev => {
      if (prev.find(i => i.materialId === mid)) return prev.filter(i => i.materialId !== mid);
      return [...prev, { materialId: mid, minRatio: 0, maxRatio: 1 }];
    });
  };

  const updateIngredient = (mid: string, field: keyof FormulaIngredient, val: string) => {
    setIngredients(prev => prev.map(i => {
      if (i.materialId !== mid) return i;
      if (field === 'fixedAmount') return { ...i, fixedAmount: val === '' ? undefined : parseFloat(val) || 0 };
      if (field === 'minRatio') return { ...i, minRatio: parseFloat(val) / 100 || 0 };
      if (field === 'maxRatio') return { ...i, maxRatio: parseFloat(val) / 100 || 0 };
      return i;
    }));
  };

  const getIngValue = (mid: string, field: keyof FormulaIngredient): string => {
    const ing = ingredients.find(i => i.materialId === mid);
    if (!ing) return '';
    if (field === 'fixedAmount') return ing.fixedAmount !== undefined ? String(ing.fixedAmount) : '';
    if (field === 'minRatio') return ing.minRatio !== undefined ? String((ing.minRatio * 100).toFixed(1)) : '';
    if (field === 'maxRatio') return ing.maxRatio !== undefined ? String((ing.maxRatio * 100).toFixed(1)) : '';
    return '';
  };

  const addConstraint = (nid: string) => {
    if (constraints.find(c => c.nutrientId === nid)) return;
    setConstraints(prev => [...prev, { nutrientId: nid, min: 0, max: 100 }]);
  };

  const removeConstraint = (nid: string) => {
    setConstraints(prev => prev.filter(c => c.nutrientId !== nid));
  };

  const updateConstraint = (nid: string, field: keyof FormulaNutrientConstraint, val: string) => {
    setConstraints(prev => prev.map(c => {
      if (c.nutrientId !== nid) return c;
      const numVal = parseFloat(val);
      return { ...c, [field]: isNaN(numVal) ? undefined : numVal };
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = '请输入产品名称';
    if (!form.defaultYield || parseFloat(form.defaultYield) <= 0) e.defaultYield = '请输入有效产量';
    if (ingredients.length === 0) e.ingredients = '请至少选择一种原料';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      category: form.category || undefined,
      status: form.status,
      defaultYield: parseFloat(form.defaultYield),
      remark: form.remark.trim() || undefined,
      ingredients,
      nutrientConstraints: constraints,
    }, initial ? '更新配方内容' : '初始版本');
  };

  // Total min ratio check
  const totalMin = ingredients.reduce((s, i) => s + (i.minRatio ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <Input label="产品名称" required value={form.name} onChange={e => set('name', e.target.value)} error={errors.name} placeholder="如：常温纯牛奶" className="col-span-2" />
        <Input label="产品编码" value={form.code} onChange={e => set('code', e.target.value)} placeholder="如：PD001" />
        <Select label="产品类别" value={form.category ?? ''} onChange={e => set('category', e.target.value)} options={categoryOptions} />
        <Select label="产品状态" value={form.status} onChange={e => set('status', e.target.value as FormulaStatus)} options={[{ value: 'draft', label: '草稿' }, { value: 'active', label: '生效' }, { value: 'disabled', label: '禁用' }]} />
        <Input label="默认目标产量" required type="number" value={form.defaultYield} onChange={e => set('defaultYield', e.target.value)} error={errors.defaultYield} suffix="kg" />
      </div>

      {/* Ingredients */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">配方原料设置</h3>
          {totalMin > 1.001 && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg">⚠ 最小比例合计 {(totalMin * 100).toFixed(1)}%，超过100%</span>
          )}
        </div>
        {errors.ingredients && <p className="text-xs text-red-500 mb-2">{errors.ingredients}</p>}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {activeMaterials.map(m => {
            const selected = !!ingredients.find(i => i.materialId === m.id);
            return (
              <div key={m.id} className={`border rounded-xl p-3 transition-colors ${selected ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-white'}`}>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selected} onChange={() => toggleIngredient(m.id)} className="w-4 h-4 rounded text-blue-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-800">{m.name}</span>
                    {m.code && <span className="text-xs text-gray-400 ml-2">({m.code})</span>}
                  </div>
                  <span className="text-xs text-gray-400">库存: {m.stock} {m.unit}</span>
                  <span className="text-xs text-gray-400">¥{m.unitCost}/{m.unit}</span>
                </div>
                {selected && (
                  <div className="mt-3 pt-3 border-t border-blue-100 grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">最小比例 (%)</label>
                      <input type="number" step="0.1" min="0" max="100" value={getIngValue(m.id, 'minRatio')} onChange={e => updateIngredient(m.id, 'minRatio', e.target.value)} placeholder="0" className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">最大比例 (%)</label>
                      <input type="number" step="0.1" min="0" max="100" value={getIngValue(m.id, 'maxRatio')} onChange={e => updateIngredient(m.id, 'maxRatio', e.target.value)} placeholder="100" className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">固定用量 (kg)</label>
                      <input type="number" step="0.1" min="0" value={getIngValue(m.id, 'fixedAmount')} onChange={e => updateIngredient(m.id, 'fixedAmount', e.target.value)} placeholder="空=按比例" className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {activeMaterials.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">暂无可用原材料，请先添加原材料</p>}
        </div>
      </div>

      {/* Nutrient Constraints */}
      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">营养指标约束</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {activeNutrients.filter(n => !constraints.find(c => c.nutrientId === n.id)).map(n => (
            <button key={n.id} onClick={() => addConstraint(n.id)} className="text-xs px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              + {n.name}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {constraints.map(c => {
            const nut = nutrients.find(n => n.id === c.nutrientId);
            return (
              <div key={c.nutrientId} className="border border-gray-100 rounded-xl p-3 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800">{nut?.name ?? c.nutrientId}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{nut?.unit}</span>
                  <button onClick={() => removeConstraint(c.nutrientId)} className="text-red-400 hover:text-red-600 ml-auto pl-2 text-xs">移除</button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">最小值</label>
                    <input type="number" step="0.01" value={c.min ?? ''} onChange={e => updateConstraint(c.nutrientId, 'min', e.target.value)} placeholder="0" className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">最大值</label>
                    <input type="number" step="0.01" value={c.max ?? ''} onChange={e => updateConstraint(c.nutrientId, 'max', e.target.value)} placeholder="100" className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">目标值 (可选)</label>
                    <input type="number" step="0.01" value={c.target ?? ''} onChange={e => updateConstraint(c.nutrientId, 'target', e.target.value)} placeholder="可选" className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">参考标准</label>
                    <input type="text" value={c.standard ?? ''} onChange={e => updateConstraint(c.nutrientId, 'standard' as keyof FormulaNutrientConstraint, e.target.value)} placeholder="如 GB 25190" className="w-full px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Textarea label="产品备注" value={form.remark} onChange={e => set('remark', e.target.value)} placeholder="工艺说明、适用季节等" rows={2} />

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button variant="secondary" onClick={onCancel}>取消</Button>
        <Button variant="primary" onClick={handleSave}>保存配方</Button>
      </div>
    </div>
  );
}

// ── Version History Modal ─────────────────────────────────
function VersionHistory({ formula, onRollback, onClose }: {
  formula: Formula;
  onRollback: (version: string) => void;
  onClose: () => void;
}) {
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  const reversed = [...formula.versions].reverse();

  const getSnap = (ver: string) => formula.versions.find(v => v.version === ver)?.snapshot;
  const snapA = compareA ? getSnap(compareA) : null;
  const snapB = compareB ? getSnap(compareB) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        {reversed.map(v => (
          <div key={v.version} className={`border rounded-xl p-4 ${v.version === formula.currentVersion ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-white'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold text-sm ${v.version === formula.currentVersion ? 'text-blue-700' : 'text-gray-600'}`}>{v.version}</span>
                {v.version === formula.currentVersion && <Badge color="blue">当前版本</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                  <input type="radio" name="cmpA" value={v.version} checked={compareA === v.version} onChange={() => setCompareA(v.version)} /> A
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                  <input type="radio" name="cmpB" value={v.version} checked={compareB === v.version} onChange={() => setCompareB(v.version)} /> B
                </label>
                {v.version !== formula.currentVersion && (
                  <Button size="xs" variant="secondary" icon={<RotateCcw size={12} />} onClick={() => { onRollback(v.version); onClose(); }}>回滚</Button>
                )}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              <span>{new Date(v.savedAt).toLocaleString('zh-CN')}</span>
              <span className="mx-2">·</span>
              <span>{v.changeSummary}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Compare */}
      {snapA && snapB && compareA !== compareB && (
        <div className="border-t border-gray-100 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <GitCompare size={15} /> 版本对比：{compareA} vs {compareB}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[{ label: compareA!, snap: snapA }, { label: compareB!, snap: snapB }].map(({ label, snap }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="font-mono font-semibold text-gray-700 mb-2">{label}</p>
                <p><span className="text-gray-500">状态：</span>{statusLabels[snap.status]}</p>
                <p><span className="text-gray-500">产量：</span>{snap.defaultYield} kg</p>
                <p className="mt-2 text-gray-500 font-medium">原料数：{snap.ingredients.length}</p>
                <p className="text-gray-500 font-medium">营养约束：{snap.nutrientConstraints.length}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onClose}>关闭</Button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────
interface Props { store: StoreType; }

export default function FormulasPage({ store }: Props) {
  const { state, addFormula, updateFormula, updateFormulaStatus, rollbackFormula, deleteFormula, duplicateFormula } = store;
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCat, setFilterCat] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Formula | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Formula | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Formula | null>(null);

  const filtered = useMemo(() => {
    return state.formulas.filter(f => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== 'all' && f.status !== filterStatus) return false;
      if (filterCat !== 'all' && f.category !== filterCat) return false;
      return true;
    });
  }, [state.formulas, search, filterStatus, filterCat]);

  const handleSave = (data: Omit<Formula, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion' | 'versions'>, summary: string) => {
    if (editTarget) {
      updateFormula(editTarget.id, data, summary);
    } else {
      addFormula(data);
    }
    setModalOpen(false);
  };

  const getMaterialName = (id: string) => state.materials.find(m => m.id === id)?.name ?? id;
  const getNutrientName = (id: string) => state.nutrients.find(n => n.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">产品配方管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理产品配方，支持版本控制与历史回滚</p>
        </div>
        <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setEditTarget(null); setModalOpen(true); }}>新建配方</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '全部', value: state.formulas.length, color: 'bg-blue-50 text-blue-700' },
          { label: '草稿', value: state.formulas.filter(f => f.status === 'draft').length, color: 'bg-yellow-50 text-yellow-700' },
          { label: '生效', value: state.formulas.filter(f => f.status === 'active').length, color: 'bg-emerald-50 text-emerald-700' },
          { label: '禁用', value: state.formulas.filter(f => f.status === 'disabled').length, color: 'bg-gray-50 text-gray-500' },
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
          <input className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" placeholder="搜索产品名称..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 bg-white" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">全部状态</option>
          <option value="draft">草稿</option>
          <option value="active">生效</option>
          <option value="disabled">禁用</option>
        </select>
        <select className="px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:border-blue-500 bg-white" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">全部类别</option>
          {categoryOptions.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Formula Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">暂无配方数据</div>
        )}
        {filtered.map(f => (
          <div key={f.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${f.status === 'disabled' ? 'opacity-60' : 'border-gray-100'}`}>
            <div className="flex items-start justify-between p-5">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-bold text-gray-900 text-lg">{f.name}</h3>
                    {f.code && <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{f.code}</span>}
                    <Badge color={statusColors[f.status]}>{statusLabels[f.status]}</Badge>
                    {f.category && <Badge color="purple">{categoryLabels[f.category] || f.category}</Badge>}
                    <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{f.currentVersion}</span>
                  </div>
                  <div className="flex items-center gap-6 mt-2 text-sm text-gray-500">
                    <span>默认产量: <strong className="text-gray-700">{f.defaultYield} kg</strong></span>
                    <span>原料: <strong className="text-gray-700">{f.ingredients.length}</strong> 种</span>
                    <span>营养约束: <strong className="text-gray-700">{f.nutrientConstraints.length}</strong> 项</span>
                    <span>版本数: <strong className="text-gray-700">{f.versions.length}</strong></span>
                  </div>
                  {/* Ingredient Pills */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {f.ingredients.slice(0, 6).map(ing => (
                      <span key={ing.materialId} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {getMaterialName(ing.materialId)}
                        {ing.fixedAmount !== undefined ? ` 固定${ing.fixedAmount}kg` : ` ${((ing.minRatio ?? 0) * 100).toFixed(0)}~${((ing.maxRatio ?? 1) * 100).toFixed(0)}%`}
                      </span>
                    ))}
                    {f.ingredients.length > 6 && <span className="text-xs text-gray-400">+{f.ingredients.length - 6}种</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {/* Status flow */}
                {f.status === 'draft' && (
                  <Button size="sm" variant="success" onClick={() => updateFormulaStatus(f.id, 'active')}>发布生效</Button>
                )}
                {f.status === 'active' && (
                  <Button size="sm" variant="warning" onClick={() => updateFormulaStatus(f.id, 'disabled')}>禁用</Button>
                )}
                {f.status === 'disabled' && (
                  <Button size="sm" variant="secondary" onClick={() => updateFormulaStatus(f.id, 'draft')}>恢复草稿</Button>
                )}
                <Button size="sm" variant="ghost" icon={<History size={14} />} onClick={() => setHistoryTarget(f)}>历史</Button>
                <Button size="sm" variant="ghost" icon={<Copy size={14} />} onClick={() => duplicateFormula(f.id)}>复制</Button>
                <Button size="sm" variant="ghost" icon={<Edit2 size={14} />} onClick={() => { setEditTarget(f); setModalOpen(true); }}>编辑</Button>
                <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} className="text-red-500 hover:bg-red-50" onClick={() => setDeleteConfirm(f)}>删除</Button>
              </div>
            </div>
            {/* Nutrient constraints preview */}
            {f.nutrientConstraints.length > 0 && (
              <div className="border-t border-gray-50 px-5 py-3 flex gap-4 flex-wrap bg-gray-50/50">
                {f.nutrientConstraints.map(nc => (
                  <div key={nc.nutrientId} className="text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{getNutrientName(nc.nutrientId)}</span>
                    <span className="ml-1">{nc.min}~{nc.max}</span>
                    {nc.target !== undefined && <span className="text-blue-500 ml-1">目标:{nc.target}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Form Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? `编辑配方：${editTarget.name}` : '新建产品配方'} size="2xl">
        <FormulaForm
          initial={editTarget || undefined}
          materials={state.materials}
          nutrients={state.nutrients}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      {/* History Modal */}
      <Modal open={!!historyTarget} onClose={() => setHistoryTarget(null)} title={`版本历史：${historyTarget?.name}`} size="xl">
        {historyTarget && (
          <VersionHistory
            formula={historyTarget}
            onRollback={ver => { rollbackFormula(historyTarget.id, ver); setHistoryTarget(null); }}
            onClose={() => setHistoryTarget(null)}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="删除配方" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-gray-700">确定要删除配方「<strong>{deleteConfirm?.name}</strong>」吗？所有版本历史将一并删除。</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>取消</Button>
            <Button variant="danger" onClick={() => { deleteFormula(deleteConfirm!.id); setDeleteConfirm(null); }}>确认删除</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
