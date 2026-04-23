// ============================================================
// 全局营养字典
// ============================================================
export interface Nutrient {
  id: string;
  name: string;
  unit: string; // g/100g, mg/100g, IU/100g, etc.
  category: 'macronutrient' | 'vitamin' | 'mineral' | 'other';
  decimalPlaces: number;
  description?: string;
}

// ============================================================
// 原材料主数据
// ============================================================
export type MaterialType =
  | 'RAW_MILK'
  | 'CREAM'
  | 'SKIM_MILK'
  | 'MILK_POWDER'
  | 'SKIM_MILK_POWDER'
  | 'WHEY_PROTEIN'
  | 'SUGAR'
  | 'STABILIZER'
  | 'VITAMIN'
  | 'MINERAL'
  | 'OTHER';

export interface MaterialNutrient {
  nutrientId: string;
  value: number; // per 100g
  historicalStdDev?: number;
}

export type SafetyMarginMode = 'POINT' | 'CONSERVATIVE' | 'BATCH_AVG';

export interface SafetyMarginConfig {
  mode: SafetyMarginMode;
  kFactor: number; // k in conservative mode
  recentBatchCount?: number; // N in batch avg mode
}

export interface Material {
  id: string;
  name: string;
  code: string;
  type: MaterialType;
  unit: string;
  defaultPrice: number; // yuan/kg
  nutrients: MaterialNutrient[];
  safetyMarginConfig: SafetyMarginConfig;
  supplierId?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 原料批次管理
// ============================================================
export interface BatchNutrient {
  nutrientId: string;
  testedValue: number;
}

export interface MaterialBatch {
  id: string;
  materialId: string;
  materialName: string; // denormalized
  batchCode: string;
  arrivalDate: string;
  expiryDate: string;
  availableStock: number; // kg
  price: number; // yuan/kg
  nutrients: BatchNutrient[];
  limsReportId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

// ============================================================
// 配方标准 (M06)
// ============================================================
export type ProductType =
  | 'RAW_MILK'
  | 'PASTEURIZED'
  | 'UHT'
  | 'FERMENTED'
  | 'FORMULA';

export type FormulaStandardStatus = 'DRAFT' | 'REVIEW' | 'ACTIVE' | 'ARCHIVED';

export type ConstraintLevel = 'NATIONAL_STD' | 'ENTERPRISE' | 'REFERENCE';

export interface MaterialConstraint {
  id: string;
  materialId: string;
  materialName: string;
  constraintType: 'RATIO' | 'FIXED';
  minRatio?: number; // 0-1
  maxRatio?: number; // 0-1
  fixedAmount?: number; // kg
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isOptional: boolean;
}

export interface NutrientConstraint {
  id: string;
  nutrientId: string;
  nutrientName: string;
  nutrientUnit: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  constraintLevel: ConstraintLevel;
  isSoft: boolean;
  penaltyCoefficient: number;
}

export interface FormulaStandardVersion {
  version: string;
  snapshot: Omit<FormulaStandard, 'versions'>;
  createdAt: string;
  createdBy: string;
  changeNote: string;
  diffFromPrev?: Record<string, { old: unknown; new: unknown }>;
}

export interface FormulaStandard {
  id: string;
  productName: string;
  productCode: string;
  productType: ProductType;
  status: FormulaStandardStatus;
  currentVersion: string;
  defaultTargetWeight: number; // kg
  materialConstraints: MaterialConstraint[];
  nutrientConstraints: NutrientConstraint[];
  nationalStdType: ProductType;
  processParameters?: {
    homogenizationPressure?: number;
    sterilizationTemp?: number;
    sterilizationDuration?: number;
  };
  versions: FormulaStandardVersion[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================
// LP 计算相关
// ============================================================
export type OptimizationObjective = 'MIN_COST' | 'MIN_INGREDIENTS' | 'CLOSEST_TARGET';

export interface BatchSelection {
  batchId: string;
  materialId: string;
  materialName: string;
  batchCode: string;
  availableStock: number;
  price: number;
  nutrients: BatchNutrient[];
}

// 标准化计算输入
export interface StandardizationInput {
  selectedBatches: BatchSelection[];
  targetFat: number; // g/100g (equality constraint)
  targetProteinMin: number; // g/100g (inequality >=)
  targetWeight: number; // kg
  targetWeightMin?: number;
  targetWeightMax?: number;
  objective: OptimizationObjective;
  additionalConstraints?: { nutrientId: string; min?: number; max?: number }[];
}

// 配方计算输入
export interface FormulaCalculationInput {
  formulaStandardId: string;
  selectedBatches: BatchSelection[];
  virtualMaterials?: VirtualMaterial[];
  targetWeight: number; // kg
  objective: OptimizationObjective;
  softConstraintMode: boolean;
}

// 虚拟原料（标准化乳）
export interface VirtualMaterial {
  id: string;
  name: string;
  sourceCalculationId: string;
  nutrients: BatchNutrient[];
  availableQuantity: number;
  unitCost: number;
  isVirtual: true;
  composition: CalculationResultItem[]; // 背后的真实原料构成
}

// 计算结果单项
export interface CalculationResultItem {
  materialId: string;
  materialName: string;
  batchId?: string;
  batchCode?: string;
  amount: number; // kg
  ratio: number; // 0-1
  cost: number; // yuan
  isVirtual?: boolean;
}

// 营养结果
export interface NutrientResult {
  nutrientId: string;
  nutrientName: string;
  nutrientUnit: string;
  calculatedValue: number;
  minConstraint?: number;
  maxConstraint?: number;
  targetValue?: number;
  constraintLevel?: ConstraintLevel;
  isSatisfied: boolean;
  deviation?: number; // from target
}

// 诊断问题
export type DiagnosticSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DiagnosticIssue {
  id: string;
  severity: DiagnosticSeverity;
  type: 'STOCK_INSUFFICIENT' | 'NUTRIENT_CONSTRAINT_TOO_STRICT' | 'RATIO_CONFLICT' | 'WEIGHT_CONFLICT';
  title: string;
  description: string;
  quantitativeGap: string;
  suggestions: Array<{
    label: string;
    action?: string;
    actionParams?: Record<string, unknown>;
  }>;
  costImpact?: string;
}

export interface DiagnosticReport {
  issues: DiagnosticIssue[];
  comprehensiveSuggestion?: string;
  diagnosisTimeMs: number;
}

// 计算结果
export interface CalculationResult {
  id: string;
  status: 'OPTIMAL' | 'INFEASIBLE' | 'UNBOUNDED' | 'ERROR';
  items: CalculationResultItem[];
  nutrients: NutrientResult[];
  totalCost: number;
  totalWeight: number;
  unitCost: number;
  objective: OptimizationObjective;
  softConstraintViolations?: Array<{ nutrientId: string; violation: number }>;
  diagnosticReport?: DiagnosticReport;
  calculatedAt: string;
  solverTimeMs: number;
}

// ============================================================
// 情景分析 (M07)
// ============================================================
export interface ScenarioOverride {
  materialPriceOverrides?: Record<string, number>; // materialId -> new price
  stockOverrides?: Record<string, number>; // batchId -> new stock
  nutrientConstraintOverrides?: Record<string, { min?: number; max?: number }>;
  targetWeight?: number;
  excludeMaterials?: string[];
  objective?: OptimizationObjective;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  baseFormulaStandardId: string;
  overrides: ScenarioOverride;
  result?: CalculationResult;
}

// ============================================================
// 数据管理 (导入/导出/数据库)
// ============================================================
export interface AppData {
  version: string;
  exportedAt: string;
  nutrients: Nutrient[];
  materials: Material[];
  batches: MaterialBatch[];
  formulaStandards: FormulaStandard[];
}

export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'sqlite';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
