// ============================================================
// 全局营养物质
// ============================================================
export interface Nutrient {
  id: string;
  name: string;
  unit: string;
  category: 'common' | 'physical' | 'microbial' | 'other';
  remark?: string;
  status: 'active' | 'disabled';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 原材料
// ============================================================
export interface MaterialNutrient {
  nutrientId: string;
  value: number; // per 100g
}

export interface Material {
  id: string;
  name: string;
  code?: string;
  category: 'base' | 'stabilizer' | 'sweetener' | 'fortifier' | 'flavoring' | 'other';
  unit: string;
  status: 'active' | 'disabled';
  remark?: string;
  stock: number;
  safeStock?: number;
  unitCost: number;
  costUpdatedAt?: string;
  nutrients: MaterialNutrient[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 产品配方
// ============================================================
export interface FormulaIngredient {
  materialId: string;
  minRatio?: number;   // 0~1
  maxRatio?: number;   // 0~1
  fixedAmount?: number; // kg (if set, locked)
}

export interface FormulaNutrientConstraint {
  nutrientId: string;
  min: number;
  max: number;
  target?: number;
  standard?: string;
}

export interface FormulaVersion {
  version: string; // e.g. "V1.0"
  savedAt: string;
  author?: string;
  changeSummary: string;
  snapshot: {
    name: string;
    code?: string;
    category?: string;
    status: FormulaStatus;
    defaultYield: number;
    remark?: string;
    ingredients: FormulaIngredient[];
    nutrientConstraints: FormulaNutrientConstraint[];
  };
}

export type FormulaStatus = 'draft' | 'active' | 'disabled';

export interface Formula {
  id: string;
  name: string;
  code?: string;
  category?: 'pure_milk' | 'modified_milk' | 'yogurt' | 'milk_powder' | 'cheese' | 'other';
  status: FormulaStatus;
  defaultYield: number; // kg
  remark?: string;
  ingredients: FormulaIngredient[];
  nutrientConstraints: FormulaNutrientConstraint[];
  currentVersion: string;
  versions: FormulaVersion[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 计算结果
// ============================================================
export type OptimizationTarget = 'min_cost' | 'min_ingredients' | 'closest_target';

export interface CalculationIngredientResult {
  materialId: string;
  amount: number;       // kg
  ratio: number;        // 0~1
  unitCost: number;
  totalCost: number;
  stockAfter: number;
  stockSufficient: boolean;
}

export interface CalculationNutrientResult {
  nutrientId: string;
  min: number;
  max: number;
  target?: number;
  actual: number;
  compliant: boolean;
}

export interface CalculationRecord {
  id: string;
  formulaId: string;
  formulaName: string;
  formulaVersion: string;
  targetYield: number;
  optimizationTarget: OptimizationTarget;
  ingredients: CalculationIngredientResult[];
  nutrients: CalculationNutrientResult[];
  totalCost: number;
  costPerTon: number;
  status: 'success' | 'infeasible' | 'error';
  errorMessage?: string;
  diagnosisMessage?: string;
  calculatedAt: string;
}

// ============================================================
// 应用状态
// ============================================================
export type PageName = 'home' | 'nutrients' | 'materials' | 'formulas' | 'calculator';

export interface AppState {
  nutrients: Nutrient[];
  materials: Material[];
  formulas: Formula[];
  calculationHistory: CalculationRecord[];
}

export interface DBConfig {
  type: 'local' | 'remote';
  connectionString?: string;
  lastSyncAt?: string;
}
