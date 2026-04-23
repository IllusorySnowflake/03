import { useState, useMemo } from 'react';
import { Play, RotateCcw, AlertCircle, CheckCircle, XCircle, Printer, Download, BarChart3, Target, DollarSign, Beaker } from 'lucide-react';
import type { Formula, CalculationRecord, OptimizationTarget, CalculationIngredientResult, CalculationNutrientResult } from '../types';
import type { StoreType } from '../store/useStore';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { solveDairyLP, computeNutrients } from '../utils/lpSolver';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

type Step = 'select' | 'params' | 'result';

const optLabels: Record<OptimizationTarget, string> = {
  min_cost: '总成本最低',
  min_ingredients: '原料种类最少',
  closest_target: '最接近营养目标值',
};

interface Props { store: StoreType; }

export default function CalculatorPage({ store }: Props) {
  const { state, addCalculationRecord } = store;
  const [step, setStep] = useState<Step>('select');
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [targetYield, setTargetYield] = useState(1000);
  const [optTarget, setOptTarget] = useState<OptimizationTarget>('min_cost');
  const [enabledMaterials, setEnabledMaterials] = useState<Set<string>>(new Set());
  const [tempStocks, setTempStocks] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<CalculationRecord | null>(null);
  const [diagModal, setDiagModal] = useState(false);

  const activeFormulas = useMemo(() => state.formulas.filter(f => f.status === 'active'), [state.formulas]);

  const selectFormula = (f: Formula) => {
    setSelectedFormula(f);
    setTargetYield(f.defaultYield);
    const enabledSet = new Set(f.ingredients.map(i => i.materialId));
    setEnabledMaterials(enabledSet);
    const stocks: Record<string, string> = {};
    f.ingredients.forEach(i => {
      const mat = state.materials.find(m => m.id === i.materialId);
      if (mat) stocks[i.materialId] = String(mat.stock);
    });
    setTempStocks(stocks);
    setStep('params');
  };

  const handleCalculate = async () => {
    if (!selectedFormula) return;
    setIsCalculating(true);

    await new Promise(r => setTimeout(r, 300)); // UI feedback

    const lpIngredients = selectedFormula.ingredients
      .filter(i => enabledMaterials.has(i.materialId))
      .map(i => {
        const mat = state.materials.find(m => m.id === i.materialId)!;
        const stock = parseFloat(tempStocks[i.materialId] ?? String(mat.stock)) || 0;
        const nutMap: Record<string, number> = {};
        mat.nutrients.forEach(mn => { nutMap[mn.nutrientId] = mn.value; });
        return {
          id: i.materialId,
          minRatio: i.minRatio,
          maxRatio: i.maxRatio,
          fixedAmount: i.fixedAmount,
          cost: mat.unitCost,
          nutrients: nutMap,
          stock,
        };
      });

    const lpConstraints = selectedFormula.nutrientConstraints.map(nc => ({
      nutrientId: nc.nutrientId,
      min: nc.min,
      max: nc.max,
      target: nc.target,
    }));

    const lpResult = solveDairyLP({
      targetYield,
      ingredients: lpIngredients,
      nutrientConstraints: lpConstraints,
      optTarget,
    });

    if (lpResult.status !== 'optimal') {
      const rec: CalculationRecord = {
        id: '',
        formulaId: selectedFormula.id,
        formulaName: selectedFormula.name,
        formulaVersion: selectedFormula.currentVersion,
        targetYield,
        optimizationTarget: optTarget,
        ingredients: [],
        nutrients: [],
        totalCost: 0,
        costPerTon: 0,
        status: 'infeasible',
        errorMessage: '无可行解',
        diagnosisMessage: lpResult.diagnosis,
        calculatedAt: new Date().toISOString(),
      };
      const id = addCalculationRecord(rec);
      setResult({ ...rec, id });
      setStep('result');
      setIsCalculating(false);
      return;
    }

    // Build result
    const ingredientResults: CalculationIngredientResult[] = [];
    for (const lpIng of lpIngredients) {
      const mat = state.materials.find(m => m.id === lpIng.id)!;
      const amount = lpResult.amounts[lpIng.id] ?? 0;
      const stock = parseFloat(tempStocks[lpIng.id] ?? String(mat.stock)) || 0;
      ingredientResults.push({
        materialId: lpIng.id,
        amount,
        ratio: amount / targetYield,
        unitCost: mat.unitCost,
        totalCost: amount * mat.unitCost,
        stockAfter: stock - amount,
        stockSufficient: stock >= amount,
      });
    }

    // Compute actual nutrients
    const actualNutrients = computeNutrients(lpResult.amounts, lpIngredients, targetYield);
    const nutrientResults: CalculationNutrientResult[] = selectedFormula.nutrientConstraints.map(nc => ({
      nutrientId: nc.nutrientId,
      min: nc.min,
      max: nc.max,
      target: nc.target,
      actual: actualNutrients[nc.nutrientId] ?? 0,
      compliant: (actualNutrients[nc.nutrientId] ?? 0) >= nc.min - 1e-6 && (actualNutrients[nc.nutrientId] ?? 0) <= nc.max + 1e-6,
    }));

    const totalCost = lpResult.totalCost;
    const rec: CalculationRecord = {
      id: '',
      formulaId: selectedFormula.id,
      formulaName: selectedFormula.name,
      formulaVersion: selectedFormula.currentVersion,
      targetYield,
      optimizationTarget: optTarget,
      ingredients: ingredientResults,
      nutrients: nutrientResults,
      totalCost,
      costPerTon: (totalCost / targetYield) * 1000,
      status: 'success',
      calculatedAt: new Date().toISOString(),
    };
    const id = addCalculationRecord(rec);
    setResult({ ...rec, id });
    setStep('result');
    setIsCalculating(false);
  };

  const resetCalc = () => {
    setStep('select');
    setSelectedFormula(null);
    setResult(null);
  };

  const getMaterialName = (id: string) => state.materials.find(m => m.id === id)?.name ?? id;
  const getNutrient = (id: string) => state.nutrients.find(n => n.id === id);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">配方计算引擎</h1>
          <p className="text-sm text-gray-500 mt-1">基于单纯形法线性规划求解器，自动优化配方配比</p>
        </div>
        {step !== 'select' && (
          <Button variant="secondary" icon={<RotateCcw size={14} />} onClick={resetCalc}>重新选择</Button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[{ key: 'select', label: '选择产品' }, { key: 'params', label: '确认参数' }, { key: 'result', label: '查看结果' }].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${step === s.key ? 'bg-blue-600 text-white' : ((['select', 'params', 'result'].indexOf(step) > i) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400')}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{i + 1}</span>
              {s.label}
            </div>
            {i < 2 && <div className="w-8 h-px bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select */}
      {step === 'select' && (
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            请从下方选择一个<strong>已生效</strong>的产品配方开始计算
          </div>
          {activeFormulas.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
              <Beaker size={32} className="mx-auto mb-3 opacity-30" />
              <p>暂无生效的产品配方</p>
              <p className="text-sm mt-1">请前往「产品配方管理」创建并发布配方</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activeFormulas.map(f => (
                <button key={f.id} onClick={() => selectFormula(f)} className="text-left bg-white border border-gray-100 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md hover:shadow-blue-50 transition-all group">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">{f.name}</span>
                        <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{f.currentVersion}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        默认产量 {f.defaultYield} kg · {f.ingredients.length} 种原料 · {f.nutrientConstraints.length} 项营养约束
                      </div>
                    </div>
                    <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-sm font-medium">
                      选择 →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Params */}
      {step === 'params' && selectedFormula && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 flex flex-col gap-5">
            {/* Target yield */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">目标产量</h3>
              <div className="flex items-center gap-3">
                <input type="number" step="10" min="1" value={targetYield} onChange={e => setTargetYield(parseFloat(e.target.value) || 0)} className="w-40 px-4 py-2 text-xl font-bold text-center border-2 border-blue-200 rounded-xl outline-none focus:border-blue-500" />
                <span className="text-gray-500">kg</span>
                <Button size="sm" variant="ghost" onClick={() => setTargetYield(selectedFormula.defaultYield)} className="text-blue-500">恢复默认</Button>
              </div>
            </div>

            {/* Optimization target */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">优化目标</h3>
              <div className="grid grid-cols-3 gap-3">
                {(['min_cost', 'min_ingredients', 'closest_target'] as OptimizationTarget[]).map(opt => (
                  <button key={opt} onClick={() => setOptTarget(opt)} className={`p-4 rounded-xl border-2 text-left transition-all ${optTarget === opt ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300'}`}>
                    <div className={`text-sm font-semibold ${optTarget === opt ? 'text-blue-700' : 'text-gray-700'}`}>{optLabels[opt]}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {opt === 'min_cost' && '在满足约束的前提下，使总配料成本最低'}
                      {opt === 'min_ingredients' && '减少原料种类，简化生产操作流程'}
                      {opt === 'closest_target' && '各营养指标尽量接近配方中的目标值'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Materials */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-4">可用原料确认 <span className="text-sm text-gray-400 font-normal">（可临时去掉库存不足的原料）</span></h3>
              <div className="space-y-3">
                {selectedFormula.ingredients.map(ing => {
                  const mat = state.materials.find(m => m.id === ing.materialId);
                  if (!mat) return null;
                  const enabled = enabledMaterials.has(ing.materialId);
                  const stockVal = parseFloat(tempStocks[ing.materialId] ?? String(mat.stock)) || 0;
                  const minRequired = (ing.minRatio ?? 0) * targetYield;
                  const isLow = stockVal < minRequired;
                  return (
                    <div key={ing.materialId} className={`flex items-center gap-4 p-3 rounded-xl border ${enabled ? 'border-gray-100' : 'border-gray-100 opacity-50'} ${isLow && enabled ? 'bg-orange-50 border-orange-200' : 'bg-gray-50'}`}>
                      <input type="checkbox" checked={enabled} onChange={e => {
                        const ns = new Set(enabledMaterials);
                        if (e.target.checked) ns.add(ing.materialId); else ns.delete(ing.materialId);
                        setEnabledMaterials(ns);
                      }} className="w-4 h-4 text-blue-600 rounded" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{mat.name}</span>
                          {ing.fixedAmount !== undefined ? (
                            <Badge color="purple">固定 {ing.fixedAmount} kg</Badge>
                          ) : (
                            <Badge color="gray">{((ing.minRatio ?? 0) * 100).toFixed(0)}%~{((ing.maxRatio ?? 1) * 100).toFixed(0)}%</Badge>
                          )}
                        </div>
                        <div className={`text-xs mt-0.5 ${isLow && enabled ? 'text-orange-600' : 'text-gray-400'}`}>
                          {isLow && enabled ? `⚠ 库存不足：最少需 ${minRequired.toFixed(0)} kg，当前仅 ${stockVal.toFixed(0)} kg` : `库存充足`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">实时库存：</span>
                        <input type="number" step="1" value={tempStocks[ing.materialId] ?? String(mat.stock)} onChange={e => setTempStocks(prev => ({ ...prev, [ing.materialId]: e.target.value }))} className="w-24 px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 text-right" />
                        <span className="text-xs text-gray-400">{mat.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-800 mb-3">配方信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">产品名称</span><span className="font-medium text-gray-800">{selectedFormula.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">当前版本</span><span className="font-mono text-blue-600">{selectedFormula.currentVersion}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">目标产量</span><span className="font-medium text-gray-800">{targetYield} kg</span></div>
                <div className="flex justify-between"><span className="text-gray-500">优化目标</span><span className="font-medium text-gray-800">{optLabels[optTarget]}</span></div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">营养约束</h4>
                {selectedFormula.nutrientConstraints.map(nc => {
                  const nut = getNutrient(nc.nutrientId);
                  return (
                    <div key={nc.nutrientId} className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-600">{nut?.name}</span>
                      <span className="text-gray-700">{nc.min}~{nc.max} <span className="text-gray-400">{nut?.unit}</span></span>
                    </div>
                  );
                })}
              </div>
            </div>

            <Button variant="primary" size="lg" icon={isCalculating ? undefined : <Play size={16} />} loading={isCalculating} onClick={handleCalculate} className="w-full justify-center">
              {isCalculating ? '求解中...' : '开始计算'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 'result' && result && (
        <div className="flex flex-col gap-5">
          {/* Status banner */}
          {result.status === 'success' ? (
            <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <CheckCircle size={22} className="text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-emerald-800 text-base">配方合规 · 求解成功</span>
                <p className="text-sm text-emerald-600 mt-0.5">所有约束条件均已满足，最优配方已计算完成</p>
              </div>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="secondary" icon={<Printer size={14} />} onClick={() => window.print()}>打印清单</Button>
                <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => {
                  const json = JSON.stringify(result, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `calc_${result.formulaName}_${result.calculatedAt.slice(0, 10)}.json`;
                  a.click();
                }}>导出结果</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex items-center gap-3">
                <XCircle size={22} className="text-red-600 shrink-0" />
                <span className="font-bold text-red-800 text-base">无可行解 · 约束冲突</span>
                <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setDiagModal(true)} icon={<AlertCircle size={13} />}>查看诊断</Button>
              </div>
              {result.diagnosisMessage && (
                <p className="text-sm text-red-700 ml-9 whitespace-pre-line">{result.diagnosisMessage.split('\n').slice(0, 2).join('\n')}</p>
              )}
            </div>
          )}

          {result.status === 'success' && (
            <>
              {/* Overview cards */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: '总原料成本', value: `¥${result.totalCost.toFixed(2)}`, sub: '本批次', icon: <DollarSign size={18} />, color: 'bg-blue-50 text-blue-700' },
                  { label: '吨成本', value: `¥${result.costPerTon.toFixed(0)}`, sub: '元/吨', icon: <BarChart3 size={18} />, color: 'bg-purple-50 text-purple-700' },
                  { label: '目标产量', value: `${result.targetYield}`, sub: 'kg', icon: <Target size={18} />, color: 'bg-emerald-50 text-emerald-700' },
                  { label: '使用原料', value: `${result.ingredients.filter(i => i.amount > 0.01).length}`, sub: '种', icon: <Beaker size={18} />, color: 'bg-amber-50 text-amber-700' },
                ].map(c => (
                  <div key={c.label} className={`rounded-2xl p-4 ${c.color} flex items-center justify-between`}>
                    <div>
                      <p className="text-xs font-medium opacity-70">{c.label}</p>
                      <p className="text-2xl font-bold mt-1">{c.value}</p>
                      <p className="text-xs opacity-60">{c.sub}</p>
                    </div>
                    <div className="opacity-30">{c.icon}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-5">
                {/* Ingredient table */}
                <div className="col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h3 className="font-semibold text-gray-800">原料用量表</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">原料名称</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">用量(kg)</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">占比</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">小计成本</th>
                        <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">库存余量</th>
                        <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">库存</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.ingredients.filter(i => i.amount > 0.001).map(ir => (
                        <tr key={ir.materialId} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{getMaterialName(ir.materialId)}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{ir.amount.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{(ir.ratio * 100).toFixed(2)}%</td>
                          <td className="px-4 py-2.5 text-right">¥{ir.totalCost.toFixed(2)}</td>
                          <td className={`px-4 py-2.5 text-right font-mono ${ir.stockSufficient ? 'text-emerald-600' : 'text-red-600'}`}>{ir.stockAfter.toFixed(1)}</td>
                          <td className="px-4 py-2.5 text-center">{ir.stockSufficient ? '✅' : '⚠️'}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-4 py-2.5 text-gray-700">合计</td>
                        <td className="px-4 py-2.5 text-right font-mono">{result.ingredients.reduce((s, i) => s + i.amount, 0).toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right">100%</td>
                        <td className="px-4 py-2.5 text-right text-blue-700">¥{result.totalCost.toFixed(2)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Pie chart */}
                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-800 mb-2">成本构成</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={result.ingredients.filter(i => i.amount > 0.001).map(ir => ({ name: getMaterialName(ir.materialId), value: parseFloat(ir.totalCost.toFixed(2)) }))} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                        {result.ingredients.filter(i => i.amount > 0.001).map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => typeof v === 'number' ? `¥${v.toFixed(2)}` : v} />
                      <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Nutrient compliance */}
              {result.nutrients.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50">
                    <h3 className="font-semibold text-gray-800">营养指标符合性校验</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    {result.nutrients.map(nr => {
                      const nut = getNutrient(nr.nutrientId);
                      const range = nr.max - nr.min;
                      const progress = range > 0 ? ((nr.actual - nr.min) / range * 100) : 50;
                      const clampedProgress = Math.max(0, Math.min(100, progress));
                      const targetProgress = nr.target !== undefined && range > 0 ? Math.max(0, Math.min(100, (nr.target - nr.min) / range * 100)) : null;
                      return (
                        <div key={nr.nutrientId} className="flex items-center gap-4">
                          <div className="w-20 text-sm font-medium text-gray-700 shrink-0">{nut?.name}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                              <span>{nr.min}</span>
                              {targetProgress !== null && <span className="text-blue-500">目标:{nr.target}</span>}
                              <span>{nr.max}</span>
                            </div>
                            <div className="relative h-3 bg-gray-100 rounded-full overflow-visible">
                              <div className={`absolute h-full rounded-full transition-all ${nr.compliant ? 'bg-emerald-400' : 'bg-red-400'}`} style={{ width: `${clampedProgress}%` }} />
                              {targetProgress !== null && (
                                <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded" style={{ left: `${targetProgress}%` }} />
                              )}
                            </div>
                          </div>
                          <div className="w-24 text-right">
                            <span className={`text-sm font-bold ${nr.compliant ? 'text-emerald-600' : 'text-red-600'}`}>{nr.actual.toFixed(3)}</span>
                            <span className="text-xs text-gray-400 ml-1">{nut?.unit}</span>
                          </div>
                          <div className="w-6 text-center shrink-0">
                            {nr.compliant ? <CheckCircle size={16} className="text-emerald-500 mx-auto" /> : <XCircle size={16} className="text-red-500 mx-auto" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Print version */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 print:block">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">投料清单（车间版）</h3>
                  <Button size="sm" variant="secondary" icon={<Printer size={14} />} onClick={() => window.print()}>打印</Button>
                </div>
                <div className="border border-gray-200 rounded-xl p-5">
                  <div className="text-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">皇氏乳业 · 投料作业清单</h2>
                    <p className="text-sm text-gray-500 mt-1">{result.formulaName} · {result.formulaVersion} · {new Date(result.calculatedAt).toLocaleString('zh-CN')}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm border-b border-gray-100 pb-4">
                    <div><span className="text-gray-500">目标产量：</span><span className="font-bold">{result.targetYield} kg</span></div>
                    <div><span className="text-gray-500">总成本：</span><span className="font-bold text-blue-700">¥{result.totalCost.toFixed(2)}</span></div>
                    <div><span className="text-gray-500">优化目标：</span><span className="font-bold">{optLabels[result.optimizationTarget]}</span></div>
                  </div>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-2 font-semibold">原料名称</th>
                        <th className="text-right py-2 font-semibold">投料量</th>
                        <th className="text-right py-2 font-semibold">占比</th>
                        <th className="text-right py-2 font-semibold">小计成本</th>
                        <th className="text-center py-2 font-semibold">确认</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.ingredients.filter(i => i.amount > 0.001).map(ir => (
                        <tr key={ir.materialId} className="border-b border-gray-100">
                          <td className="py-2">{getMaterialName(ir.materialId)}</td>
                          <td className="py-2 text-right font-mono font-bold">{ir.amount.toFixed(2)} kg</td>
                          <td className="py-2 text-right">{(ir.ratio * 100).toFixed(2)}%</td>
                          <td className="py-2 text-right">¥{ir.totalCost.toFixed(2)}</td>
                          <td className="py-2 text-center">□</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 text-xs text-gray-400 text-center">称量精度建议：±0.1 kg · 操作员签名：_____________</div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" icon={<RotateCcw size={14} />} onClick={() => { setStep('params'); setResult(null); }}>重新计算</Button>
            <Button variant="ghost" onClick={resetCalc}>选择其他产品</Button>
          </div>
        </div>
      )}

      {/* Diagnosis Modal */}
      <Modal open={diagModal} onClose={() => setDiagModal(false)} title="无解诊断报告" size="lg">
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm font-semibold text-red-800 mb-2">原因分析：</p>
            <p className="text-sm text-red-700 whitespace-pre-line">{result?.diagnosisMessage}</p>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm font-semibold text-blue-800 mb-2">建议调整方向：</p>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>检查各原料最小使用比例之和是否超过100%</li>
              <li>检查营养指标约束范围是否过于严格</li>
              <li>适当增加可用原料种类，或放宽某些约束的上下限</li>
              <li>检查固定用量原料是否占用了过多的总产量份额</li>
              <li>确认各原料库存是否足以满足最小用量要求</li>
            </ul>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDiagModal(false)}>关闭</Button>
            <Button variant="primary" onClick={() => { setDiagModal(false); setStep('params'); setResult(null); }}>返回调整参数</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
