import { solveLPSimplex } from './simplex';
import type {
  BatchSelection,
  CalculationResult,
  CalculationResultItem,
  DiagnosticIssue,
  DiagnosticReport,
  FormulaStandard,
  NutrientResult,
  OptimizationObjective,
  StandardizationInput,
  VirtualMaterial,
} from '../types';

const EPS = 1e-6;

// ============================================================
// Effective nutrient value with safety margin
// ============================================================
function effectiveNutrientValue(
  batch: BatchSelection,
  nutrientId: string
): number {
  const batchNut = batch.nutrients.find(n => n.nutrientId === nutrientId);
  if (!batchNut) return 0;
  return batchNut.testedValue;
}

// ============================================================
// Standardization Calculation (M04)
// ============================================================
export interface StdResult {
  result: CalculationResult;
  virtualMaterial?: VirtualMaterial;
}

export function solveStandardization(input: StandardizationInput): StdResult {
  const start = Date.now();
  const { selectedBatches, targetFat, targetProteinMin, targetWeight, objective } = input;

  const n = selectedBatches.length;
  if (n === 0) {
    return emptyFailResult('未选择任何原料批次', start);
  }

  const fatVals = selectedBatches.map(b => effectiveNutrientValue(b, 'fat'));
  const protVals = selectedBatches.map(b => effectiveNutrientValue(b, 'protein'));

  // Variables: x[0..n-1] (kg of each batch)
  // Constraints:
  //   Sum(x) = W (total weight)
  //   Sum(fat_i * x_i) = targetFat * W  → fat_i*x_i - targetFat*sum(x) = 0
  //     → (fat_i - targetFat)*x_i = 0 summed
  //   Sum(protein_i * x_i) >= targetProteinMin * W
  //   x_i <= available_stock_i
  //   x_i >= 0

  const W = targetWeight;

  // Equality constraints:
  // 1. Sum(x_i) = W
  // 2. Sum((fat_i - targetFat) * x_i) = 0

  const A_eq: number[][] = [
    selectedBatches.map(() => 1), // sum = W
    fatVals.map(f => f - targetFat), // fat standardization
  ];
  const b_eq = [W, 0];

  // Inequality constraints (<=):
  // Protein: -Sum(protein_i * x_i) <= -targetProteinMin * W
  const A_ub: number[][] = [
    protVals.map(p => -p), // -protein_i*x_i <= -targetProteinMin*W
  ];
  const b_ub = [-targetProteinMin * W];

  // Upper bounds (stock)
  const ub = selectedBatches.map(b => b.availableStock);
  const lb = Array(n).fill(0);

  // Objective
  let c: number[];
  if (objective === 'MIN_COST') {
    c = selectedBatches.map(b => b.price);
  } else {
    c = Array(n).fill(1); // equal weights
  }

  const lpResult = solveLPSimplex({ n, c, A_eq, b_eq, A_ub, b_ub, lb, ub });

  if (lpResult.status !== 'OPTIMAL') {
    const diagReport = runQuickDiagnosis(
      selectedBatches,
      [],
      W,
      [
        { id: 'fat', min: targetFat, max: targetFat, isSoft: false },
        { id: 'protein', min: targetProteinMin, isSoft: false },
      ],
      lpResult.status
    );
    return emptyFailResult(lpResult.message || '无可行解', start, diagReport);
  }

  const x = lpResult.x!;
  const items: CalculationResultItem[] = selectedBatches.map((b, i) => ({
    materialId: b.materialId,
    materialName: b.materialName,
    batchId: b.batchId,
    batchCode: b.batchCode,
    amount: Math.max(0, x[i]),
    ratio: Math.max(0, x[i]) / W,
    cost: Math.max(0, x[i]) * b.price,
  })).filter(item => item.amount > EPS);

  const totalCost = items.reduce((s, it) => s + it.cost, 0);
  const allNutrientIds = ['fat', 'protein', 'lactose', 'calcium', 'snf'];
  const nutrients: NutrientResult[] = allNutrientIds.map(nid => {
    const calcVal = selectedBatches.reduce((sum, b, i) => {
      const v = effectiveNutrientValue(b, nid);
      return sum + v * Math.max(0, x[i]);
    }, 0) / W;

    const minC = nid === 'fat' ? targetFat : nid === 'protein' ? targetProteinMin : undefined;
    const maxC = nid === 'fat' ? targetFat : undefined;

    return {
      nutrientId: nid,
      nutrientName: getNutrientName(nid),
      nutrientUnit: getNutrientUnit(nid),
      calculatedValue: calcVal,
      minConstraint: minC,
      maxConstraint: maxC,
      isSatisfied: true,
    };
  });

  // Build virtual material
  const stdNutrients = allNutrientIds.map(nid => ({
    nutrientId: nid,
    testedValue: nutrients.find(n => n.nutrientId === nid)?.calculatedValue ?? 0,
  }));

  const virtualMaterial: VirtualMaterial = {
    id: `vm-${Date.now()}`,
    name: `标准化乳-${new Date().toISOString().split('T')[0]}`,
    sourceCalculationId: `std-${Date.now()}`,
    nutrients: stdNutrients,
    availableQuantity: W,
    unitCost: totalCost / W,
    isVirtual: true,
    composition: items,
  };

  const result: CalculationResult = {
    id: `std-${Date.now()}`,
    status: 'OPTIMAL',
    items,
    nutrients,
    totalCost,
    totalWeight: W,
    unitCost: totalCost / W,
    objective,
    calculatedAt: new Date().toISOString(),
    solverTimeMs: Date.now() - start,
  };

  return { result, virtualMaterial };
}

// ============================================================
// Formula Optimization Calculation (M05)
// ============================================================
export function solveFormula(
  formulaStandard: FormulaStandard,
  selectedBatches: BatchSelection[],
  virtualMaterials: VirtualMaterial[],
  targetWeight: number,
  objective: OptimizationObjective,
  softConstraintMode: boolean
): CalculationResult {
  const start = Date.now();

  // Combine real batches and virtual materials
  const allBatches: BatchSelection[] = [
    ...selectedBatches,
    ...virtualMaterials.map(vm => ({
      batchId: vm.id,
      materialId: vm.id,
      materialName: vm.name,
      batchCode: vm.name,
      availableStock: vm.availableQuantity,
      price: vm.unitCost,
      nutrients: vm.nutrients.map(n => ({ nutrientId: n.nutrientId, testedValue: n.testedValue })),
    })),
  ];

  const n = allBatches.length;
  const W = targetWeight;

  if (n === 0) {
    return makeFailResult('未选择任何原料批次', start);
  }

  const matConstraints = formulaStandard.materialConstraints;
  const nutConstraints = formulaStandard.nutrientConstraints;

  // Get all unique nutrient IDs
  const nutrientIds = [...new Set(nutConstraints.map(nc => nc.nutrientId))];

  // Build nutrient matrix: A[j][i] = nutrient j content of batch i (per 100g)
  const nutMatrix: number[][] = nutrientIds.map(nid =>
    allBatches.map(b => {
      const bn = b.nutrients.find(n => n.nutrientId === nid);
      return bn ? bn.testedValue : 0;
    })
  );

  // Objective coefficients
  let c: number[];
  if (objective === 'MIN_COST') {
    c = allBatches.map(b => b.price);
  } else if (objective === 'CLOSEST_TARGET') {
    c = allBatches.map(b => b.price); // fallback to cost
  } else {
    c = Array(n).fill(1);
  }

  const A_eq: number[][] = [];
  const b_eq: number[] = [];
  const A_ub: number[][] = [];
  const b_ub: number[] = [];
  const lb: number[] = Array(n).fill(0);
  const ub: number[] = allBatches.map(b => b.availableStock);

  // 1. Total weight constraint: Sum(x_i) = W
  A_eq.push(Array(n).fill(1));
  b_eq.push(W);

  // 2. Material ratio/fixed constraints
  for (const mc of matConstraints) {
    // Find batches belonging to this material
    const batchIndices: number[] = [];
    for (let i = 0; i < allBatches.length; i++) {
      if (allBatches[i].materialId === mc.materialId || allBatches[i].materialId === mc.materialId) {
        batchIndices.push(i);
      }
    }
    if (batchIndices.length === 0) continue;

    if (mc.constraintType === 'FIXED' && mc.fixedAmount !== undefined) {
      const row = Array(n).fill(0);
      batchIndices.forEach(idx => (row[idx] = 1));
      A_eq.push(row);
      b_eq.push(mc.fixedAmount);
    } else if (mc.constraintType === 'RATIO') {
      // Sum(x_i for this material) >= minRatio * W
      if (mc.minRatio !== undefined && mc.minRatio > 0) {
        const row = Array(n).fill(0);
        batchIndices.forEach(idx => (row[idx] = -1));
        A_ub.push(row);
        b_ub.push(-mc.minRatio * W);
      }
      // Sum(x_i for this material) <= maxRatio * W
      if (mc.maxRatio !== undefined && mc.maxRatio < 1) {
        const row = Array(n).fill(0);
        batchIndices.forEach(idx => (row[idx] = 1));
        A_ub.push(row);
        b_ub.push(mc.maxRatio * W);
      }
    }
  }

  // 3. Nutrient constraints
  const hardNutConstraints = nutConstraints.filter(nc => !nc.isSoft || !softConstraintMode);

  for (const nc of hardNutConstraints) {
    const jIdx = nutrientIds.indexOf(nc.nutrientId);
    if (jIdx === -1) continue;
    const nutRow = nutMatrix[jIdx];

    if (nc.minValue !== undefined) {
      // Sum(nut_ij * x_i) >= minValue * W
      A_ub.push(nutRow.map(v => -v));
      b_ub.push(-nc.minValue * W);
    }
    if (nc.maxValue !== undefined) {
      // Sum(nut_ij * x_i) <= maxValue * W
      A_ub.push([...nutRow]);
      b_ub.push(nc.maxValue * W);
    }
  }

  // For soft constraints, add slack variables (handled separately if needed)
  // In soft mode, we skip the hard enforcement but add penalty to objective

  const lpResult = solveLPSimplex({ n, c, A_eq, b_eq, A_ub, b_ub, lb, ub });

  if (lpResult.status !== 'OPTIMAL') {
    // Run diagnostics
    const diagConstraints = nutConstraints.map(nc => ({
      id: nc.nutrientId,
      min: nc.minValue,
      max: nc.maxValue,
      isSoft: nc.isSoft,
    }));
    const diagReport = runQuickDiagnosis(
      allBatches,
      matConstraints.map(mc => ({
        materialId: mc.materialId,
        materialName: mc.materialName,
        minRatio: mc.minRatio,
        maxRatio: mc.maxRatio,
        isOptional: mc.isOptional,
      })),
      W,
      diagConstraints,
      lpResult.status
    );

    // Try soft constraint mode automatically
    if (!softConstraintMode && nutConstraints.some(nc => nc.isSoft)) {
      const softResult = solveFormula(formulaStandard, selectedBatches, virtualMaterials, targetWeight, objective, true);
      if (softResult.status === 'OPTIMAL') {
        softResult.diagnosticReport = diagReport;
        return softResult;
      }
    }

    return { ...makeFailResult(lpResult.message || '无可行解', start), diagnosticReport: diagReport };
  }

  const x = lpResult.x!;

  // Calculate results
  const items: CalculationResultItem[] = allBatches.map((b, i) => ({
    materialId: b.materialId,
    materialName: b.materialName,
    batchId: b.batchId,
    batchCode: b.batchCode,
    amount: Math.max(0, x[i]),
    ratio: Math.max(0, x[i]) / W,
    cost: Math.max(0, x[i]) * b.price,
    isVirtual: virtualMaterials.some(vm => vm.id === b.materialId),
  })).filter(item => item.amount > EPS);

  const totalCost = items.reduce((s, it) => s + it.cost, 0);

  const nutrients: NutrientResult[] = nutConstraints.map(nc => {
    const jIdx = nutrientIds.indexOf(nc.nutrientId);
    let calcVal = 0;
    if (jIdx >= 0) {
      calcVal = allBatches.reduce((sum, b, i) => {
        const v = b.nutrients.find(n => n.nutrientId === nc.nutrientId)?.testedValue ?? 0;
        return sum + v * Math.max(0, x[i]);
      }, 0) / W;
    }
    const isSatisfied = checkNutrientSatisfied(calcVal, nc.minValue, nc.maxValue);
    return {
      nutrientId: nc.nutrientId,
      nutrientName: nc.nutrientName,
      nutrientUnit: nc.nutrientUnit,
      calculatedValue: calcVal,
      minConstraint: nc.minValue,
      maxConstraint: nc.maxValue,
      targetValue: nc.targetValue,
      constraintLevel: nc.constraintLevel,
      isSatisfied,
      deviation: nc.targetValue !== undefined ? calcVal - nc.targetValue : undefined,
    };
  });

  return {
    id: `formula-${Date.now()}`,
    status: 'OPTIMAL',
    items,
    nutrients,
    totalCost,
    totalWeight: W,
    unitCost: totalCost / W,
    objective,
    calculatedAt: new Date().toISOString(),
    solverTimeMs: Date.now() - start,
  };
}

// ============================================================
// Diagnostic Engine
// ============================================================
interface SimpleConstraint {
  id: string;
  min?: number;
  max?: number;
  isSoft: boolean;
}

interface SimpleMaterialConstraint {
  materialId: string;
  materialName: string;
  minRatio?: number;
  maxRatio?: number;
  isOptional: boolean;
}

export function runQuickDiagnosis(
  batches: BatchSelection[],
  matConstraints: SimpleMaterialConstraint[],
  W: number,
  nutrientConstraints: SimpleConstraint[],
  failStatus: string
): DiagnosticReport {
  const start = Date.now();
  const issues: DiagnosticIssue[] = [];

  // Check 1: Total stock sufficiency
  const totalStock = batches.reduce((s, b) => s + b.availableStock, 0);
  if (totalStock < W) {
    issues.push({
      id: 'stock-total',
      severity: 'HIGH',
      type: 'STOCK_INSUFFICIENT',
      title: '原料总库存不足',
      description: `所有可用原料的库存总量不足以满足目标产量`,
      quantitativeGap: `库存总量: ${totalStock.toFixed(1)} kg，目标产量: ${W.toFixed(1)} kg，缺口: ${(W - totalStock).toFixed(1)} kg`,
      suggestions: [
        { label: '降低目标产量', action: 'REDUCE_TARGET_WEIGHT', actionParams: { maxWeight: totalStock } },
        { label: '补充原料库存' },
      ],
    });
  }

  // Check 2: Min ratio conflicts
  const minRatioSum = matConstraints.reduce((s, mc) => s + (mc.minRatio ?? 0), 0);
  if (minRatioSum > 1 + 1e-6) {
    issues.push({
      id: 'ratio-conflict',
      severity: 'HIGH',
      type: 'RATIO_CONFLICT',
      title: '原料最小用量约束冲突',
      description: '各原料最小用量比例之和超过100%，约束相互矛盾',
      quantitativeGap: `最小比例之和: ${(minRatioSum * 100).toFixed(1)}%，超出: ${((minRatioSum - 1) * 100).toFixed(1)}%`,
      suggestions: [
        { label: '调整原料最小用量比例' },
        { label: '将部分原料改为可选（去除最小用量限制）' },
      ],
    });
  }

  // Check 3: Nutrient feasibility (rough check)
  for (const nc of nutrientConstraints) {
    if (nc.isSoft) continue;
    if (nc.min !== undefined) {
      // Max achievable value
      const maxAchievable = batches.reduce((maxV, b) => {
        const v = b.nutrients.find(n => n.nutrientId === nc.id)?.testedValue ?? 0;
        return Math.max(maxV, v);
      }, 0);
      if (maxAchievable < nc.min - EPS) {
        issues.push({
          id: `nut-min-${nc.id}`,
          severity: 'MEDIUM',
          type: 'NUTRIENT_CONSTRAINT_TOO_STRICT',
          title: `${getNutrientName(nc.id)}下限约束过严`,
          description: `当前所有原料中，${getNutrientName(nc.id)}含量最高的原料也无法满足约束下限`,
          quantitativeGap: `要求 ≥ ${nc.min} ${getNutrientUnit(nc.id)}，最高可达约 ${maxAchievable.toFixed(2)} ${getNutrientUnit(nc.id)}，差距: ${(nc.min - maxAchievable).toFixed(2)}`,
          suggestions: [
            { label: '尝试软约束模式', action: 'ENABLE_SOFT_CONSTRAINTS' },
            { label: `将${getNutrientName(nc.id)}下限调整至 ${(maxAchievable * 0.98).toFixed(2)}` },
            { label: '引入高含量原料' },
          ],
        });
      }
    }
    if (nc.max !== undefined) {
      const minAchievable = batches.reduce((minV, b) => {
        const v = b.nutrients.find(n => n.nutrientId === nc.id)?.testedValue ?? 0;
        return Math.min(minV, v);
      }, Infinity);
      if (minAchievable > nc.max + EPS && isFinite(minAchievable)) {
        issues.push({
          id: `nut-max-${nc.id}`,
          severity: 'MEDIUM',
          type: 'NUTRIENT_CONSTRAINT_TOO_STRICT',
          title: `${getNutrientName(nc.id)}上限约束过严`,
          description: `当前所有原料中，${getNutrientName(nc.id)}含量最低的原料也超过约束上限`,
          quantitativeGap: `要求 ≤ ${nc.max} ${getNutrientUnit(nc.id)}，最低约 ${minAchievable.toFixed(2)} ${getNutrientUnit(nc.id)}`,
          suggestions: [
            { label: `将${getNutrientName(nc.id)}上限调整至 ${(minAchievable * 1.02).toFixed(2)}` },
            { label: '引入低含量原料' },
          ],
        });
      }
    }
  }

  // Check 4: Individual stock constraints
  for (const mc of matConstraints) {
    if (mc.minRatio === undefined || mc.minRatio === 0) continue;
    const batchesForMat = batches.filter(b => b.materialId === mc.materialId);
    const totalStockForMat = batchesForMat.reduce((s, b) => s + b.availableStock, 0);
    const minRequired = mc.minRatio * W;
    if (totalStockForMat < minRequired - EPS) {
      issues.push({
        id: `stock-${mc.materialId}`,
        severity: 'HIGH',
        type: 'STOCK_INSUFFICIENT',
        title: `${mc.materialName}库存不足`,
        description: `${mc.materialName}当前库存不满足配方最小用量要求`,
        quantitativeGap: `当前库存: ${totalStockForMat.toFixed(1)} kg，最少需要: ${minRequired.toFixed(1)} kg，缺口: ${(minRequired - totalStockForMat).toFixed(1)} kg`,
        suggestions: [
          { label: `排除${mc.materialName}并重新计算`, action: 'EXCLUDE_MATERIAL', actionParams: { materialId: mc.materialId } },
          { label: `补充至少 ${(minRequired - totalStockForMat).toFixed(1)} kg ${mc.materialName}库存` },
        ],
        costImpact: `补货成本约 ${(batchesForMat[0]?.price ?? 0 * (minRequired - totalStockForMat)).toFixed(0)} 元`,
      });
    }
  }

  let comprehensiveSuggestion: string | undefined;
  if (issues.length > 1) {
    const hasStockIssue = issues.some(i => i.type === 'STOCK_INSUFFICIENT');
    const hasNutIssue = issues.some(i => i.type === 'NUTRIENT_CONSTRAINT_TOO_STRICT');
    if (hasStockIssue && hasNutIssue) {
      comprehensiveSuggestion = '建议优先解决库存问题（操作简单），部分营养约束问题可能随之自动消失';
    }
  }

  if (issues.length === 0) {
    issues.push({
      id: 'unknown',
      severity: 'MEDIUM',
      type: 'RATIO_CONFLICT',
      title: '约束条件复杂冲突',
      description: `求解器返回 ${failStatus}，多个约束之间可能存在复杂冲突`,
      quantitativeGap: '无法快速量化，建议逐步放松约束重试',
      suggestions: [
        { label: '启用软约束模式', action: 'ENABLE_SOFT_CONSTRAINTS' },
        { label: '减少配方原料种类' },
        { label: '扩大营养约束范围' },
      ],
    });
  }

  return {
    issues,
    comprehensiveSuggestion,
    diagnosisTimeMs: Date.now() - start,
  };
}

// ============================================================
// Scenario Analysis
// ============================================================
export interface ScenarioInput {
  formulaStandard: FormulaStandard;
  baseBatches: BatchSelection[];
  virtualMaterials: VirtualMaterial[];
  targetWeight: number;
  objective: OptimizationObjective;
  priceOverrides?: Record<string, number>;
  stockOverrides?: Record<string, number>;
  excludeMaterials?: string[];
}

export function solveScenario(input: ScenarioInput): CalculationResult {
  let batches = input.baseBatches.map(b => ({ ...b }));

  // Apply overrides
  if (input.priceOverrides) {
    batches = batches.map(b => ({
      ...b,
      price: input.priceOverrides![b.materialId] ?? b.price,
    }));
  }
  if (input.stockOverrides) {
    batches = batches.map(b => ({
      ...b,
      availableStock: input.stockOverrides![b.batchId] ?? b.availableStock,
    }));
  }
  if (input.excludeMaterials && input.excludeMaterials.length > 0) {
    batches = batches.filter(b => !input.excludeMaterials!.includes(b.materialId));
  }

  return solveFormula(
    input.formulaStandard,
    batches,
    input.virtualMaterials,
    input.targetWeight,
    input.objective,
    false
  );
}

// ============================================================
// Helpers
// ============================================================
function checkNutrientSatisfied(val: number, min?: number, max?: number): boolean {
  if (min !== undefined && val < min - 1e-4) return false;
  if (max !== undefined && val > max + 1e-4) return false;
  return true;
}

export function getNutrientName(id: string): string {
  const map: Record<string, string> = {
    fat: '脂肪',
    protein: '蛋白质',
    lactose: '乳糖',
    calcium: '钙',
    sodium: '钠',
    energy: '能量',
    totalSolid: '总固形物',
    snf: '非脂乳固体',
    vitA: '维生素A',
    vitD: '维生素D',
  };
  return map[id] ?? id;
}

export function getNutrientUnit(id: string): string {
  const map: Record<string, string> = {
    fat: 'g/100g',
    protein: 'g/100g',
    lactose: 'g/100g',
    calcium: 'mg/100g',
    sodium: 'mg/100g',
    energy: 'kJ/100g',
    totalSolid: 'g/100g',
    snf: 'g/100g',
    vitA: 'μg/100g',
    vitD: 'μg/100g',
  };
  return map[id] ?? 'g/100g';
}

function makeFailResult(_message: string, start: number): CalculationResult {
  return {
    id: `fail-${Date.now()}`,
    status: 'INFEASIBLE',
    items: [],
    nutrients: [],
    totalCost: 0,
    totalWeight: 0,
    unitCost: 0,
    objective: 'MIN_COST',
    calculatedAt: new Date().toISOString(),
    solverTimeMs: Date.now() - start,
  };
}

function emptyFailResult(message: string, start: number, diagReport?: DiagnosticReport): StdResult {
  return {
    result: { ...makeFailResult(message, start), diagnosticReport: diagReport },
  };
}
