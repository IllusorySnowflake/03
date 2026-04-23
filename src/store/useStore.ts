import { create } from 'zustand';
import type {
  Nutrient,
  Material,
  MaterialBatch,
  FormulaStandard,
  CalculationResult,
  VirtualMaterial,
  AppData,
  ConnectionStatus,
} from '../types';
import {
  SAMPLE_NUTRIENTS,
  SAMPLE_MATERIALS,
  SAMPLE_BATCHES,
  SAMPLE_FORMULA_STANDARDS,
} from '../data/sampleData';

export type AppPage =
  | 'home'
  | 'nutrients'
  | 'materials'
  | 'batches'
  | 'formula-standards'
  | 'standardization'
  | 'formula-calc'
  | 'scenario'
  | 'data-management';

interface StoreState {
  // Navigation
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;

  // Data
  nutrients: Nutrient[];
  materials: Material[];
  batches: MaterialBatch[];
  formulaStandards: FormulaStandard[];

  // CRUD operations
  addNutrient: (nutrient: Nutrient) => void;
  updateNutrient: (nutrient: Nutrient) => void;
  deleteNutrient: (id: string) => void;

  addMaterial: (material: Material) => void;
  updateMaterial: (material: Material) => void;
  deleteMaterial: (id: string) => void;

  addBatch: (batch: MaterialBatch) => void;
  updateBatch: (batch: MaterialBatch) => void;
  deleteBatch: (id: string) => void;

  addFormulaStandard: (fs: FormulaStandard) => void;
  updateFormulaStandard: (fs: FormulaStandard) => void;
  deleteFormulaStandard: (id: string) => void;

  // Calculation results
  lastStdResult?: CalculationResult;
  lastVirtualMaterial?: VirtualMaterial;
  lastFormulaResult?: CalculationResult;
  setLastStdResult: (r: CalculationResult, vm?: VirtualMaterial) => void;
  setLastFormulaResult: (r: CalculationResult) => void;

  // Data management
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (s: ConnectionStatus) => void;
  exportData: () => AppData;
  importData: (data: AppData) => void;
  resetToSampleData: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  currentPage: 'home',
  setCurrentPage: (page) => set({ currentPage: page }),

  nutrients: SAMPLE_NUTRIENTS,
  materials: SAMPLE_MATERIALS,
  batches: SAMPLE_BATCHES,
  formulaStandards: SAMPLE_FORMULA_STANDARDS,

  addNutrient: (nutrient) =>
    set((state) => ({ nutrients: [...state.nutrients, nutrient] })),
  updateNutrient: (nutrient) =>
    set((state) => ({
      nutrients: state.nutrients.map((n) => (n.id === nutrient.id ? nutrient : n)),
    })),
  deleteNutrient: (id) =>
    set((state) => ({ nutrients: state.nutrients.filter((n) => n.id !== id) })),

  addMaterial: (material) =>
    set((state) => ({ materials: [...state.materials, material] })),
  updateMaterial: (material) =>
    set((state) => ({
      materials: state.materials.map((m) => (m.id === material.id ? material : m)),
    })),
  deleteMaterial: (id) =>
    set((state) => ({ materials: state.materials.filter((m) => m.id !== id) })),

  addBatch: (batch) =>
    set((state) => ({ batches: [...state.batches, batch] })),
  updateBatch: (batch) =>
    set((state) => ({
      batches: state.batches.map((b) => (b.id === batch.id ? batch : b)),
    })),
  deleteBatch: (id) =>
    set((state) => ({ batches: state.batches.filter((b) => b.id !== id) })),

  addFormulaStandard: (fs) =>
    set((state) => ({ formulaStandards: [...state.formulaStandards, fs] })),
  updateFormulaStandard: (fs) =>
    set((state) => ({
      formulaStandards: state.formulaStandards.map((f) => (f.id === fs.id ? fs : f)),
    })),
  deleteFormulaStandard: (id) =>
    set((state) => ({
      formulaStandards: state.formulaStandards.filter((f) => f.id !== id),
    })),

  lastStdResult: undefined,
  lastVirtualMaterial: undefined,
  lastFormulaResult: undefined,
  setLastStdResult: (r, vm) => set({ lastStdResult: r, lastVirtualMaterial: vm }),
  setLastFormulaResult: (r) => set({ lastFormulaResult: r }),

  connectionStatus: 'disconnected',
  setConnectionStatus: (s) => set({ connectionStatus: s }),

  exportData: () => {
    const { nutrients, materials, batches, formulaStandards } = get();
    return {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      nutrients,
      materials,
      batches,
      formulaStandards,
    };
  },

  importData: (data) => {
    set({
      nutrients: data.nutrients,
      materials: data.materials,
      batches: data.batches,
      formulaStandards: data.formulaStandards,
    });
  },

  resetToSampleData: () => {
    set({
      nutrients: SAMPLE_NUTRIENTS,
      materials: SAMPLE_MATERIALS,
      batches: SAMPLE_BATCHES,
      formulaStandards: SAMPLE_FORMULA_STANDARDS,
    });
  },
}));
