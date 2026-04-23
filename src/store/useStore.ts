import { useState, useEffect, useCallback } from 'react';
import type {
  AppState, Nutrient, Material, Formula, CalculationRecord,
  FormulaVersion, FormulaStatus, PageName, DBConfig
} from '../types';
import { defaultNutrients, defaultMaterials, defaultFormulas } from './defaultData';

const STORAGE_KEY = 'huangshi_dairy_v1';
const DB_CONFIG_KEY = 'huangshi_dairy_db_config';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function now(): string {
  return new Date().toISOString();
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    nutrients: defaultNutrients,
    materials: defaultMaterials,
    formulas: defaultFormulas,
    calculationHistory: [],
  };
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ============================================================
// Main store hook
// ============================================================
export function useStore() {
  const [state, setState] = useState<AppState>(loadState);
  const [page, setPage] = useState<PageName>('home');
  const [dbConfig, setDbConfigState] = useState<DBConfig>(() => {
    try {
      const raw = localStorage.getItem(DB_CONFIG_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { type: 'local' };
  });

  // Auto-persist
  useEffect(() => {
    saveState(state);
  }, [state]);

  const updateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState(updater);
  }, []);

  // ── Nutrients ──────────────────────────────────────────────
  const addNutrient = useCallback((data: Omit<Nutrient, 'id' | 'createdAt' | 'updatedAt'>) => {
    const nutrient: Nutrient = { ...data, id: generateId(), createdAt: now(), updatedAt: now() };
    updateState(s => ({ ...s, nutrients: [...s.nutrients, nutrient] }));
    return nutrient.id;
  }, [updateState]);

  const updateNutrient = useCallback((id: string, data: Partial<Nutrient>) => {
    updateState(s => ({
      ...s,
      nutrients: s.nutrients.map(n => n.id === id ? { ...n, ...data, updatedAt: now() } : n)
    }));
  }, [updateState]);

  const deleteNutrient = useCallback((id: string): string | null => {
    // Check references in materials
    const refMaterial = state.materials.find(m => m.nutrients.some(mn => mn.nutrientId === id));
    if (refMaterial) return `原料「${refMaterial.name}」正在引用该营养物质，请先解除引用后再删除`;
    // Check references in formulas
    const refFormula = state.formulas.find(f => f.nutrientConstraints.some(nc => nc.nutrientId === id));
    if (refFormula) return `产品配方「${refFormula.name}」正在引用该营养物质，请先解除引用后再删除`;
    updateState(s => ({ ...s, nutrients: s.nutrients.filter(n => n.id !== id) }));
    return null;
  }, [state, updateState]);

  const reorderNutrients = useCallback((nutrients: Nutrient[]) => {
    updateState(s => ({ ...s, nutrients }));
  }, [updateState]);

  // ── Materials ──────────────────────────────────────────────
  const addMaterial = useCallback((data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => {
    const material: Material = { ...data, id: generateId(), createdAt: now(), updatedAt: now() };
    updateState(s => ({ ...s, materials: [...s.materials, material] }));
    return material.id;
  }, [updateState]);

  const updateMaterial = useCallback((id: string, data: Partial<Material>) => {
    updateState(s => ({
      ...s,
      materials: s.materials.map(m => m.id === id ? { ...m, ...data, updatedAt: now() } : m)
    }));
  }, [updateState]);

  const deleteMaterial = useCallback((id: string): string | null => {
    const refFormula = state.formulas.find(f => f.ingredients.some(i => i.materialId === id));
    if (refFormula) return `产品配方「${refFormula.name}」正在引用该原料，请先解除引用后再删除`;
    updateState(s => ({ ...s, materials: s.materials.filter(m => m.id !== id) }));
    return null;
  }, [state, updateState]);

  const duplicateMaterial = useCallback((id: string) => {
    const original = state.materials.find(m => m.id === id);
    if (!original) return;
    const copy: Material = {
      ...original,
      id: generateId(),
      name: `${original.name}（副本）`,
      code: original.code ? `${original.code}-COPY` : undefined,
      createdAt: now(),
      updatedAt: now(),
    };
    updateState(s => ({ ...s, materials: [...s.materials, copy] }));
  }, [state, updateState]);

  // ── Formulas ───────────────────────────────────────────────
  const makeVersionSnapshot = (f: Formula): FormulaVersion['snapshot'] => ({
    name: f.name, code: f.code, category: f.category,
    status: f.status, defaultYield: f.defaultYield, remark: f.remark,
    ingredients: f.ingredients.map(i => ({ ...i })),
    nutrientConstraints: f.nutrientConstraints.map(nc => ({ ...nc })),
  });

  const nextVersion = (current: string, major = false): string => {
    const match = current.match(/^V(\d+)\.(\d+)$/);
    if (!match) return 'V1.0';
    const [, maj, min] = match;
    return major ? `V${parseInt(maj) + 1}.0` : `V${maj}.${parseInt(min) + 1}`;
  };

  const addFormula = useCallback((data: Omit<Formula, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion' | 'versions'>) => {
    const id = generateId();
    const formula: Formula = {
      ...data, id,
      currentVersion: 'V1.0',
      versions: [{
        version: 'V1.0',
        savedAt: now(),
        changeSummary: '初始版本',
        snapshot: {
          name: data.name, code: data.code, category: data.category,
          status: data.status, defaultYield: data.defaultYield, remark: data.remark,
          ingredients: data.ingredients.map(i => ({ ...i })),
          nutrientConstraints: data.nutrientConstraints.map(nc => ({ ...nc })),
        }
      }],
      createdAt: now(),
      updatedAt: now(),
    };
    updateState(s => ({ ...s, formulas: [...s.formulas, formula] }));
    return id;
  }, [updateState]);

  const updateFormula = useCallback((id: string, data: Partial<Formula>, changeSummary?: string, majorVersion = false) => {
    updateState(s => ({
      ...s,
      formulas: s.formulas.map(f => {
        if (f.id !== id) return f;
        const newVer = nextVersion(f.currentVersion, majorVersion);
        const snapshot = makeVersionSnapshot({ ...f, ...data } as Formula);
        const versionEntry: FormulaVersion = {
          version: newVer,
          savedAt: now(),
          changeSummary: changeSummary || '更新配方',
          snapshot,
        };
        return {
          ...f,
          ...data,
          currentVersion: newVer,
          versions: [...f.versions, versionEntry],
          updatedAt: now(),
        };
      })
    }));
  }, [updateState]);

  const updateFormulaStatus = useCallback((id: string, status: FormulaStatus) => {
    updateFormula(id, { status }, `状态变更为：${status === 'active' ? '生效' : status === 'disabled' ? '禁用' : '草稿'}`);
  }, [updateFormula]);

  const rollbackFormula = useCallback((id: string, version: string) => {
    updateState(s => ({
      ...s,
      formulas: s.formulas.map(f => {
        if (f.id !== id) return f;
        const target = f.versions.find(v => v.version === version);
        if (!target) return f;
        const newVer = nextVersion(f.currentVersion);
        const versionEntry: FormulaVersion = {
          version: newVer,
          savedAt: now(),
          changeSummary: `回滚到版本 ${version}`,
          snapshot: { ...target.snapshot },
        };
        const snap = target.snapshot;
        return {
          ...f,
          name: snap.name,
          code: snap.code,
          category: snap.category as Formula['category'],
          status: snap.status,
          defaultYield: snap.defaultYield,
          remark: snap.remark,
          ingredients: snap.ingredients,
          nutrientConstraints: snap.nutrientConstraints,
          currentVersion: newVer,
          versions: [...f.versions, versionEntry],
          updatedAt: now(),
        };
      })
    }));
  }, [updateState]);

  const deleteFormula = useCallback((id: string) => {
    updateState(s => ({ ...s, formulas: s.formulas.filter(f => f.id !== id) }));
  }, [updateState]);

  const duplicateFormula = useCallback((id: string) => {
    const original = state.formulas.find(f => f.id === id);
    if (!original) return;
    const newId = generateId();
    const formula: Formula = {
      ...original,
      id: newId,
      name: `${original.name}（副本）`,
      code: original.code ? `${original.code}-COPY` : undefined,
      status: 'draft',
      currentVersion: 'V1.0',
      versions: [{
        version: 'V1.0',
        savedAt: now(),
        changeSummary: `从 ${original.name} 复制`,
        snapshot: {
          name: `${original.name}（副本）`,
          code: original.code ? `${original.code}-COPY` : undefined,
          category: original.category,
          status: 'draft',
          defaultYield: original.defaultYield,
          remark: original.remark,
          ingredients: original.ingredients.map(i => ({ ...i })),
          nutrientConstraints: original.nutrientConstraints.map(nc => ({ ...nc })),
        }
      }],
      createdAt: now(),
      updatedAt: now(),
    };
    updateState(s => ({ ...s, formulas: [...s.formulas, formula] }));
  }, [state, updateState]);

  // ── Calculation History ────────────────────────────────────
  const addCalculationRecord = useCallback((record: Omit<CalculationRecord, 'id'>) => {
    const r: CalculationRecord = { ...record, id: generateId() };
    updateState(s => ({
      ...s,
      calculationHistory: [r, ...s.calculationHistory].slice(0, 100),
    }));
    return r.id;
  }, [updateState]);

  // ── Data Import/Export ─────────────────────────────────────
  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `huangshi_dairy_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const importData = useCallback((jsonStr: string): string | null => {
    try {
      const data = JSON.parse(jsonStr) as AppState;
      if (!data.nutrients || !data.materials || !data.formulas) {
        return '数据格式错误，请选择正确的导出文件';
      }
      setState(data);
      return null;
    } catch {
      return '文件解析失败，请检查文件格式';
    }
  }, []);

  const exportModule = useCallback((module: 'nutrients' | 'materials' | 'formulas') => {
    const data = { [module]: state[module] };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `huangshi_${module}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const resetToDefault = useCallback(() => {
    setState({
      nutrients: defaultNutrients,
      materials: defaultMaterials,
      formulas: defaultFormulas,
      calculationHistory: [],
    });
  }, []);

  const saveDbConfig = useCallback((config: DBConfig) => {
    const updated = { ...config, lastSyncAt: now() };
    setDbConfigState(updated);
    localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(updated));
  }, []);

  return {
    state,
    page,
    setPage,
    dbConfig,
    saveDbConfig,
    // nutrients
    addNutrient,
    updateNutrient,
    deleteNutrient,
    reorderNutrients,
    // materials
    addMaterial,
    updateMaterial,
    deleteMaterial,
    duplicateMaterial,
    // formulas
    addFormula,
    updateFormula,
    updateFormulaStatus,
    rollbackFormula,
    deleteFormula,
    duplicateFormula,
    // calculation
    addCalculationRecord,
    // data
    exportData,
    importData,
    exportModule,
    resetToDefault,
  };
}

export type StoreType = ReturnType<typeof useStore>;
