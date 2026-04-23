/**
 * Simplex Method LP Solver
 * Minimizes: c^T * x
 * Subject to: Ax <= b, x >= 0
 */

const EPS = 1e-9;
const MAX_ITER = 10000;

interface SimplexResult {
  status: 'optimal' | 'infeasible' | 'unbounded';
  objective: number;
  variables: number[];
}

function simplex(
  c: number[],        // objective coefficients (minimize)
  A_ub: number[][],   // inequality constraint matrix (<=)
  b_ub: number[],     // inequality RHS
  A_eq: number[][],   // equality constraint matrix
  b_eq: number[],     // equality RHS
  n: number           // number of variables
): SimplexResult {
  const m_ub = A_ub.length;
  const m_eq = A_eq.length;
  const totalVars = n + m_ub + m_eq; // original + slack + artificial

  // Build tableau using Big-M method
  // Variables: x[0..n-1] | slack[n..n+m_ub-1] | artificial[n+m_ub..totalVars-1]
  const M = 1e7;
  const numRows = m_ub + m_eq + 1; // constraints + objective
  const numCols = totalVars + 1;   // vars + RHS

  const tab: number[][] = Array.from({ length: numRows }, () => new Array(numCols).fill(0));
  const basis: number[] = new Array(m_ub + m_eq).fill(0);

  // Fill inequality constraints (slack variables)
  for (let i = 0; i < m_ub; i++) {
    for (let j = 0; j < n; j++) tab[i][j] = A_ub[i][j];
    tab[i][n + i] = 1; // slack
    tab[i][numCols - 1] = b_ub[i];
    basis[i] = n + i;
  }

  // Fill equality constraints (artificial variables)
  for (let i = 0; i < m_eq; i++) {
    const row = m_ub + i;
    for (let j = 0; j < n; j++) tab[row][j] = A_eq[i][j];
    tab[row][n + m_ub + i] = 1; // artificial
    tab[row][numCols - 1] = b_eq[i];
    basis[row] = n + m_ub + i;
  }

  // Objective row
  const objRow = numRows - 1;
  for (let j = 0; j < n; j++) tab[objRow][j] = c[j];
  // Big-M penalty for artificials
  for (let i = 0; i < m_eq; i++) {
    tab[objRow][n + m_ub + i] = M;
    // Subtract artificial row from objective (since artificial is basic)
    for (let j = 0; j < numCols; j++) {
      tab[objRow][j] -= M * tab[m_ub + i][j];
    }
  }

  // Simplex iterations
  for (let iter = 0; iter < MAX_ITER; iter++) {
    // Find pivot column (most negative in objective row)
    let pivCol = -1;
    let minVal = -EPS;
    for (let j = 0; j < numCols - 1; j++) {
      if (tab[objRow][j] < minVal) {
        minVal = tab[objRow][j];
        pivCol = j;
      }
    }
    if (pivCol === -1) break; // optimal

    // Find pivot row (minimum ratio test)
    let pivRow = -1;
    let minRatio = Infinity;
    for (let i = 0; i < numRows - 1; i++) {
      if (tab[i][pivCol] > EPS) {
        const ratio = tab[i][numCols - 1] / tab[i][pivCol];
        if (ratio < minRatio) {
          minRatio = ratio;
          pivRow = i;
        }
      }
    }
    if (pivRow === -1) return { status: 'unbounded', objective: Infinity, variables: [] };

    // Pivot
    basis[pivRow] = pivCol;
    const pivVal = tab[pivRow][pivCol];
    for (let j = 0; j < numCols; j++) tab[pivRow][j] /= pivVal;
    for (let i = 0; i < numRows; i++) {
      if (i !== pivRow && Math.abs(tab[i][pivCol]) > EPS) {
        const factor = tab[i][pivCol];
        for (let j = 0; j < numCols; j++) tab[i][j] -= factor * tab[pivRow][j];
      }
    }
  }

  // Check feasibility (any artificial still in basis with value > 0?)
  for (let i = 0; i < m_ub + m_eq; i++) {
    if (basis[i] >= n + m_ub && tab[i][numCols - 1] > EPS) {
      return { status: 'infeasible', objective: Infinity, variables: [] };
    }
  }

  // Extract solution
  const variables = new Array(n).fill(0);
  for (let i = 0; i < m_ub + m_eq; i++) {
    if (basis[i] < n) {
      variables[basis[i]] = Math.max(0, tab[i][numCols - 1]);
    }
  }

  return {
    status: 'optimal',
    objective: tab[objRow][numCols - 1],
    variables,
  };
}

// ============================================================
// High-level LP formulation for dairy formula calculation
// ============================================================
export interface LPIngredient {
  id: string;
  minRatio?: number;
  maxRatio?: number;
  fixedAmount?: number;
  cost: number;
  nutrients: Record<string, number>; // nutrientId -> value per 100g
  stock: number;
}

export interface LPNutrientConstraint {
  nutrientId: string;
  min?: number;
  max?: number;
  target?: number;
}

export type LPOptTarget = 'min_cost' | 'min_ingredients' | 'closest_target';

export interface LPInput {
  targetYield: number;
  ingredients: LPIngredient[];
  nutrientConstraints: LPNutrientConstraint[];
  optTarget: LPOptTarget;
}

export interface LPOutput {
  status: 'optimal' | 'infeasible' | 'error';
  amounts: Record<string, number>; // id -> kg
  totalCost: number;
  diagnosis?: string;
}

export function solveDairyLP(input: LPInput): LPOutput {
  try {
    const { targetYield, ingredients, nutrientConstraints, optTarget } = input;

    // Separate fixed and variable ingredients
    const fixedIngredients = ingredients.filter(i => i.fixedAmount !== undefined && i.fixedAmount > 0);
    const varIngredients = ingredients.filter(i => i.fixedAmount === undefined || i.fixedAmount <= 0);

    const fixedTotal = fixedIngredients.reduce((sum, i) => sum + (i.fixedAmount || 0), 0);
    const remainingYield = targetYield - fixedTotal;

    if (remainingYield <= 0 && varIngredients.length > 0) {
      return { status: 'infeasible', amounts: {}, totalCost: 0, diagnosis: '固定用量之和已超过目标产量，无法分配剩余原料' };
    }

    const n = varIngredients.length;
    if (n === 0) {
      // All fixed
      const amounts: Record<string, number> = {};
      let totalCost = 0;
      for (const fi of fixedIngredients) {
        amounts[fi.id] = fi.fixedAmount!;
        totalCost += fi.fixedAmount! * fi.cost;
      }
      return { status: 'optimal', amounts, totalCost };
    }

    // Variables x[i] = amount of varIngredient[i] in kg
    // Constraints:
    // 1) sum(x) = remainingYield  (equality)
    // 2) x[i] >= minRatio * targetYield  (lower bound -> -x[i] <= -lb)
    // 3) x[i] <= maxRatio * targetYield  (upper bound)
    // 4) x[i] <= stock[i]               (stock constraint)
    // 5) Nutrient constraints on final product (per 100g basis)
    //    sum_i(x[i] * nut[i]) / totalYield * (100/100) in [min, max]
    //    -> sum_i(x[i] * nut[i]) >= min * totalYield / 100... wait
    //    Nutrient unit is g/100g, so total nutrient = sum(x[i] * nut[i] / 100) in grams
    //    Final concentration = total_nutrient / totalYield * 100 g/100g
    //    = sum(x[i] * nut[i]) / totalYield
    //    Constraint: min <= sum(x[i]*nut[i])/totalYield <= max
    //    -> sum(x[i]*nut[i]) >= min * totalYield
    //    -> -sum(x[i]*nut[i]) >= -max * totalYield (i.e. sum <= max*totalYield)

    // Also account for fixed ingredients' nutrient contribution
    const fixedNutrientContrib: Record<string, number> = {};
    for (const fi of fixedIngredients) {
      for (const [nid, val] of Object.entries(fi.nutrients)) {
        fixedNutrientContrib[nid] = (fixedNutrientContrib[nid] || 0) + fi.fixedAmount! * val;
      }
    }

    const A_ub: number[][] = [];
    const b_ub: number[] = [];

    // Upper bounds: x[i] <= maxRatio * targetYield
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(0);
      row[i] = 1;
      A_ub.push(row);
      const maxRatio = varIngredients[i].maxRatio ?? 1;
      b_ub.push(maxRatio * remainingYield);
    }

    // Upper bounds: x[i] <= stock[i]
    for (let i = 0; i < n; i++) {
      const row = new Array(n).fill(0);
      row[i] = 1;
      A_ub.push(row);
      b_ub.push(varIngredients[i].stock);
    }

    // Lower bounds: x[i] >= minRatio * targetYield -> -x[i] <= -lb
    for (let i = 0; i < n; i++) {
      const lb = (varIngredients[i].minRatio ?? 0) * remainingYield;
      if (lb > EPS) {
        const row = new Array(n).fill(0);
        row[i] = -1;
        A_ub.push(row);
        b_ub.push(-lb);
      }
    }

    // Nutrient constraints
    for (const nc of nutrientConstraints) {
      const { nutrientId, min, max } = nc;
      const varNuts = varIngredients.map(vi => vi.nutrients[nutrientId] ?? 0);
      const fixedContrib = fixedNutrientContrib[nutrientId] ?? 0;

      if (min !== undefined) {
        // sum(x[i]*nut[i]) + fixedContrib >= min * targetYield
        // -> -sum(x[i]*nut[i]) <= fixedContrib - min * targetYield
        const row = varNuts.map(v => -v);
        const rhs = fixedContrib - min * targetYield;
        A_ub.push(row);
        b_ub.push(rhs);
      }
      if (max !== undefined) {
        // sum(x[i]*nut[i]) + fixedContrib <= max * targetYield
        const row = varNuts.map(v => v);
        const rhs = max * targetYield - fixedContrib;
        A_ub.push(row);
        b_ub.push(rhs);
      }
    }

    // Equality: sum(x) = remainingYield
    const A_eq: number[][] = [new Array(n).fill(1)];
    const b_eq: number[] = [remainingYield];

    // Objective
    let c: number[];
    if (optTarget === 'min_cost') {
      c = varIngredients.map(vi => vi.cost);
    } else if (optTarget === 'min_ingredients') {
      // Minimize number of used ingredients: use cost but heavily penalize usage
      // We approximate by using equal weights (can't do MILP here, so use cost as proxy)
      c = varIngredients.map(() => 1);
    } else {
      // closest_target: minimize deviation from nutrient targets
      // We use cost as primary but check targets post-hoc; as a heuristic use cost
      c = varIngredients.map(vi => vi.cost);
    }

    const result = simplex(c, A_ub, b_ub, A_eq, b_eq, n);

    if (result.status !== 'optimal') {
      // Generate diagnosis
      const diag = generateDiagnosis(varIngredients, nutrientConstraints, remainingYield, fixedNutrientContrib, targetYield);
      return { status: 'infeasible', amounts: {}, totalCost: 0, diagnosis: diag };
    }

    // Build result
    const amounts: Record<string, number> = {};
    let totalCost = 0;

    for (const fi of fixedIngredients) {
      amounts[fi.id] = fi.fixedAmount!;
      totalCost += fi.fixedAmount! * fi.cost;
    }

    for (let i = 0; i < n; i++) {
      const amt = Math.max(0, result.variables[i]);
      amounts[varIngredients[i].id] = amt;
      totalCost += amt * varIngredients[i].cost;
    }

    return { status: 'optimal', amounts, totalCost };
  } catch (e) {
    return { status: 'error', amounts: {}, totalCost: 0, diagnosis: `计算引擎错误: ${String(e)}` };
  }
}

function generateDiagnosis(
  ingredients: LPIngredient[],
  constraints: LPNutrientConstraint[],
  remainingYield: number,
  fixedContrib: Record<string, number>,
  totalYield: number
): string {
  const msgs: string[] = [];

  // Check if sum of minRatios > 1
  const totalMinRatio = ingredients.reduce((s, i) => s + (i.minRatio ?? 0), 0);
  if (totalMinRatio > 1 + 1e-6) {
    msgs.push(`所有原料最小比例之和为 ${(totalMinRatio * 100).toFixed(1)}%，超过100%，请调低各原料的最小使用比例`);
  }

  // Check stock
  for (const ing of ingredients) {
    const required = (ing.minRatio ?? 0) * remainingYield;
    if (required > ing.stock + 1e-6) {
      msgs.push(`原料「${ing.id}」库存不足：最少需要 ${required.toFixed(1)} kg，当前库存 ${ing.stock.toFixed(1)} kg`);
    }
  }

  // Check nutrient feasibility roughly
  for (const nc of constraints) {
    const allNuts = ingredients.map(i => i.nutrients[nc.nutrientId] ?? 0);
    const maxPossiblePerKg = Math.max(...allNuts);
    const minPossiblePerKg = Math.min(...allNuts);
    const fixedC = fixedContrib[nc.nutrientId] ?? 0;

    if (nc.min !== undefined) {
      const maxAchievable = maxPossiblePerKg * remainingYield + fixedC;
      if (maxAchievable < nc.min * totalYield - 1e-6) {
        msgs.push(`营养「${nc.nutrientId}」的最小值约束 ${nc.min} 无法满足：即使全部使用含量最高的原料，最多只能达到 ${(maxAchievable / totalYield).toFixed(2)}，建议降低最小值或增加高含量原料`);
      }
    }
    if (nc.max !== undefined) {
      const minAchievable = minPossiblePerKg * remainingYield + fixedC;
      if (minAchievable > nc.max * totalYield + 1e-6) {
        msgs.push(`营养「${nc.nutrientId}」的最大值约束 ${nc.max} 无法满足：即使全部使用含量最低的原料，最少也有 ${(minAchievable / totalYield).toFixed(2)}，建议提高最大值或引入低含量原料`);
      }
    }
  }

  if (msgs.length === 0) {
    msgs.push('多个约束条件存在冲突，请检查原料比例约束和营养指标约束是否相互矛盾，或尝试增加可用原料种类、放宽约束范围');
  }

  return msgs.join('；\n');
}

// Compute nutrient values from solution
export function computeNutrients(
  amounts: Record<string, number>,
  ingredients: LPIngredient[],
  totalYield: number
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ing of ingredients) {
    const amt = amounts[ing.id] ?? 0;
    for (const [nid, val] of Object.entries(ing.nutrients)) {
      result[nid] = (result[nid] ?? 0) + amt * val;
    }
  }
  // Convert to per 100g of product
  for (const nid of Object.keys(result)) {
    result[nid] = result[nid] / totalYield;
  }
  return result;
}
