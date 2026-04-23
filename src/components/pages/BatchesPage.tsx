import { useState } from 'react';
import { Plus, Edit2, Trash2, Search, ClipboardList, AlertTriangle, Clock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { MaterialBatch } from '../../types';
import { Card, CardBody, CardHeader } from '../shared/Card';
import { Modal } from '../shared/Modal';
import { Badge } from '../shared/Badge';
import { PageHeader } from '../layout/PageHeader';

function getBatchStatus(batch: MaterialBatch): { label: string; variant: 'red' | 'yellow' | 'green' | 'gray' } {
  const today = new Date();
  const exp = new Date(batch.expiryDate);
  const diffDays = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return { label: '已过期', variant: 'red' };
  if (diffDays <= 7) return { label: `${Math.ceil(diffDays)}天到期`, variant: 'yellow' };
  return { label: '正常', variant: 'green' };
}

function BatchForm({ initial, onSave, onCancel }: {
  initial?: MaterialBatch;
  onSave: (b: MaterialBatch) => void;
  onCancel: () => void;
}) {
  const { materials, nutrients } = useStore();
  const [selectedMaterialId, setSelectedMaterialId] = useState(initial?.materialId ?? '');
  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  const [form, setForm] = useState<MaterialBatch>(initial ?? {
    id: `batch-${Date.now()}`,
    materialId: '',
    materialName: '',
    batchCode: '',
    arrivalDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    availableStock: 0,
    price: 0,
    nutrients: [],
    isActive: true,
    createdAt: new Date().toISOString(),
  });

  const setField = (k: keyof MaterialBatch, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const handleMaterialChange = (matId: string) => {
    const mat = materials.find(m => m.id === matId);
    setSelectedMaterialId(matId);
    setField('materialId', matId);
    setField('materialName', mat?.name ?? '');
    setField('price', mat?.defaultPrice ?? 0);
    // Pre-fill nutrients from material defaults
    if (mat) {
      setForm(p => ({
        ...p,
        materialId: matId,
        materialName: mat.name,
        price: mat.defaultPrice,
        nutrients: mat.nutrients.map(mn => ({ nutrientId: mn.nutrientId, testedValue: mn.value })),
      }));
    }
  };

  const setNutValue = (nutId: string, value: number) => {
    setForm(p => {
      const existing = p.nutrients.find(n => n.nutrientId === nutId);
      if (existing) {
        return { ...p, nutrients: p.nutrients.map(n => n.nutrientId === nutId ? { ...n, testedValue: value } : n) };
      }
      return { ...p, nutrients: [...p.nutrients, { nutrientId: nutId, testedValue: value }] };
    });
  };

  const getNutValue = (nutId: string) => form.nutrients.find(n => n.nutrientId === nutId)?.testedValue ?? 0;

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">原料 *</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedMaterialId}
            onChange={e => handleMaterialChange(e.target.value)}
          >
            <option value="">请选择原料</option>
            {materials.filter(m => m.isActive).map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">批次编号 *</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.batchCode} onChange={e => setField('batchCode', e.target.value)} placeholder="如：RM-001-20250610-A" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">LIMS报告编号</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.limsReportId ?? ''} onChange={e => setField('limsReportId', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">到货日期</label>
          <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.arrivalDate} onChange={e => setField('arrivalDate', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">过期日期</label>
          <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.expiryDate} onChange={e => setField('expiryDate', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">可用库存（kg）</label>
          <input type="number" step="0.1" className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.availableStock} onChange={e => setField('availableStock', parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">采购价格（元/kg）</label>
          <input type="number" step="0.01" className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.price} onChange={e => setField('price', parseFloat(e.target.value) || 0)} />
        </div>
      </div>

      {selectedMaterial && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-2 border-t pt-3">LIMS检测数据（per 100g）</div>
          <div className="grid grid-cols-2 gap-2">
            {selectedMaterial.nutrients.map(mn => {
              const nut = nutrients.find(n => n.id === mn.nutrientId);
              return (
                <div key={mn.nutrientId} className="flex items-center gap-2">
                  <label className="text-xs text-gray-600 w-24 flex-shrink-0">{nut?.name ?? mn.nutrientId}</label>
                  <input type="number" step="0.01"
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={getNutValue(mn.nutrientId)}
                    onChange={e => setNutValue(mn.nutrientId, parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-xs text-gray-400 w-16 flex-shrink-0">{nut?.unit}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={() => form.materialId && form.batchCode && onSave(form)}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors">保存</button>
        <button onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200 transition-colors">取消</button>
      </div>
    </div>
  );
}

export function BatchesPage() {
  const { batches, materials, addBatch, updateBatch, deleteBatch } = useStore();
  const [search, setSearch] = useState('');
  const [matFilter, setMatFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const today = new Date();

  const filtered = batches.filter(b => {
    const matchSearch = b.materialName.includes(search) || b.batchCode.includes(search);
    const matchMat = matFilter === 'ALL' || b.materialId === matFilter;
    const exp = new Date(b.expiryDate);
    const diffDays = (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    const matchStatus =
      statusFilter === 'ALL' ? true :
      statusFilter === 'EXPIRING' ? (diffDays >= 0 && diffDays <= 7) :
      statusFilter === 'NORMAL' ? diffDays > 7 :
      statusFilter === 'EXPIRED' ? diffDays < 0 : true;
    return matchSearch && matchMat && matchStatus;
  });

  const expiringCount = batches.filter(b => {
    const d = (new Date(b.expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return d >= 0 && d <= 7;
  }).length;

  return (
    <div className="flex-1 p-6">
      <PageHeader
        icon={<ClipboardList size={20} className="text-white" />}
        iconBg="from-emerald-500 to-teal-600"
        title="原料批次管理"
        subtitle="记录每次到货的批次信息和LIMS检测数据，是动态配方计算的核心数据源"
        action={
          <button onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus size={16} /> 录入批次
          </button>
        }
      />

      <div className="max-w-6xl">
        {expiringCount > 0 && (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle size={16} className="text-amber-600" />
            <span className="text-amber-800 font-medium">{expiringCount} 个批次将在7天内到期，建议优先使用</span>
            <button onClick={() => setStatusFilter('EXPIRING')} className="ml-auto text-amber-700 underline text-xs">仅显示临期</button>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="搜索批次..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
            value={matFilter} onChange={e => setMatFilter(e.target.value)}>
            <option value="ALL">全部原料</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">全部状态</option>
            <option value="NORMAL">正常</option>
            <option value="EXPIRING">临期（≤7天）</option>
            <option value="EXPIRED">已过期</option>
          </select>
        </div>

        <Card>
          <CardHeader>
            <span className="text-sm font-medium text-gray-500">共 {filtered.length} 个批次</span>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">批次编号</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">原料</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">状态</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">到货日期</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">过期日期</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">库存(kg)</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">价格(元/kg)</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">LIMS编号</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b => {
                    const status = getBatchStatus(b);
                    return (
                      <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{b.batchCode}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{b.materialName}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {status.variant === 'yellow' && <Clock size={12} className="text-amber-500" />}
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{b.arrivalDate}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{b.expiryDate}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{b.availableStock.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-700">¥{b.price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{b.limsReportId ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => setEditingId(b.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => deleteBatch(b.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="text-center text-gray-400 py-10">暂无数据</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={isAdding} onClose={() => setIsAdding(false)} title="录入批次" size="xl">
        <BatchForm onSave={b => { addBatch(b); setIsAdding(false); }} onCancel={() => setIsAdding(false)} />
      </Modal>
      <Modal isOpen={!!editingId} onClose={() => setEditingId(null)} title="编辑批次" size="xl">
        {editingId && (
          <BatchForm
            initial={batches.find(b => b.id === editingId)}
            onSave={b => { updateBatch(b); setEditingId(null); }}
            onCancel={() => setEditingId(null)}
          />
        )}
      </Modal>
    </div>
  );
}
