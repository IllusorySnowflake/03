/**
 * Simplex LP Solver
 * Solves: min c^T x
 *   subject to: Ax <= b (inequality constraints)
 *               Aeq x = beq (equality constraints)
 *               lb <= x <= ub
 *               x >= 0
 *
 * Uses Big-M method for equality constraints and >= constraints.
 */

export interface LPProblem {
  // Objective: minimize c·x
  c: number[];
  // Inequality constraints: A_ub · x <= b_ub
  A_ub?: number[][];
  b_ub?: number[];
  // Equality constraints: A_eq · x = b_eq
  A_eq?: number[][];
  b_eq?: number[];
  // Bounds: lb[i] <= x[i] <= ub[i]
  lb?: number[];
  ub?: number[];
  n: number; // number of decision variables
}

export interface LPResult {
  status: 'OPTIMAL' | 'INFEASIBLE' | 'UNBOUNDED' | 'ERROR';
  x?: number[];
  objectiveValue?: number;
  message?: string;
  iterations?: number;
}

const BIG_M = 1e7;
const EPS = 1e-9;
const MAX_ITER = 10000;

export function solveLPSimplex(problem: LPProblem): LPResult {
  try {
    return solveInternal(problem);
  } catch (e) {
    return { status: 'ERROR', message: String(e) };
  }
}

function solveInternal(problem: LPProblem): LPResult {
  const { n, c, A_ub = [], b_ub = [], A_eq = [], b_eq = [], lb, ub } = problem;

  // Handle variable bounds by substitution:
  // If lb[i] > 0: shift x[i] = x'[i] + lb[i], x'[i] >= 0
  // This transforms bounds into constraint form
  const lowerBounds = lb ? lb.map(v => (v ?? 0)) : Array(n).fill(0);
  const upperBounds = ub ? ub.map(v => (v ?? Infinity)) : Array(n).fill(Infinity);

  // Shift variables: x'[i] = x[i] - lowerBounds[i]
  // Adjust RHS of constraints
  const aUb = A_ub.map(row => [...row]);
  const bUb = [...b_ub];
  const aEq = A_eq.map(row => [...row]);
  const bEq = [...b_eq];
  const cShifted = [...c];

  // Adjust RHS for lower bounds
  for (let i = 0; i < n; i++) {
    const lb_i = lowerBounds[i];
    if (lb_i !== 0) {
      for (let r = 0; r < aUb.length; r++) {
        bUb[r] -= aUb[r][i] * lb_i;
      }
      for (let r = 0; r < aEq.length; r++) {
        bEq[r] -= aEq[r][i] * lb_i;
      }
    }
  }

  // Add upper bound constraints: x'[i] <= ub[i] - lb[i]
  const ubConstraints: number[][] = [];
  const ubRhs: number[] = [];
  for (let i = 0; i < n; i++) {
    const effUb = upperBounds[i] - lowerBounds[i];
    if (isFinite(effUb)) {
      const row = Array(n).fill(0);
      row[i] = 1;
      ubConstraints.push(row);
      ubRhs.push(effUb);
    }
  }

  // Build tableau using Big-M method
  // Variables: x'[0..n-1] (decision), s[slack], a[artificial]
  // Constraints:
  //   1. A_ub · x' + s = b_ub  (s >= 0, b_ub may need negation if < 0)
  //   2. A_eq · x' + a = b_eq  (artificial variables with big-M penalty)
  //   3. ubConstraints: x'[i] + s = effUb

  const allIneq = [...aUb.map((r, i) => ({ row: r, rhs: bUb[i] })), ...ubConstraints.map((r, i) => ({ row: r, rhs: ubRhs[i] }))];
  const allEq = aEq.map((r, i) => ({ row: r, rhs: bEq[i] }));

  // Handle negative RHS for inequalities (multiply by -1 → change direction)
  // We need all constraints in form: ... = b >= 0
  const processedRows: { row: number[]; rhs: number; artificial: boolean }[] = [];

  for (const { row, rhs } of allIneq) {
    if (rhs < -EPS) {
      // Multiply by -1: becomes >= constraint, need artificial
      processedRows.push({ row: row.map(v => -v), rhs: -rhs, artificial: true });
    } else {
      processedRows.push({ row: [...row], rhs, artificial: false });
    }
  }

  for (const { row, rhs } of allEq) {
    if (rhs < -EPS) {
      processedRows.push({ row: row.map(v => -v), rhs: -rhs, artificial: true });
    } else {
      processedRows.push({ row: [...row], rhs, artificial: true });
    }
  }

  const m = processedRows.length;
  // Count: each row that is inequality without artificial gets a slack
  // Each row that needs artificial gets artificial + possibly subtract slack for >= turned

  // Rebuild: for each constraint row:
  // - If not artificial: add slack s_i >= 0  → ... + s_i = rhs
  // - If artificial: for equality: ... + a_i = rhs
  //                 for negated ineq: ... - s_i + a_i = rhs (s_i is surplus)
  // But we simplified: all constraints with artificial=false came from original <= (after possible negation we use artificial=true)
  // So: artificial=false → slack; artificial=true → artificial (no extra surplus here since we flipped sign)

  // Total variables in tableau:
  // n (original shifted) + m_noart (slack for non-artificial rows) + m_art (artificial for artificial rows)
  const artRows = processedRows.filter(r => r.artificial);
  const noArtRows = processedRows.filter(r => !r.artificial);

  const numArt = artRows.length;
  const numNoArtSlack = noArtRows.length;
  const totalCols = n + numNoArtSlack + numArt + 1; // +1 for RHS

  // Build tableau
  // Column order: [x'_0..n-1, slack_0..numNoArtSlack-1, art_0..numArt-1, RHS]
  const tableau: number[][] = [];
  const basis: number[] = [];

  let slackIdx = 0;
  let artIdx = 0;

  for (const { row, rhs, artificial } of processedRows) {
    const tRow = Array(totalCols).fill(0);
    for (let j = 0; j < n; j++) tRow[j] = row[j];

    if (!artificial) {
      tRow[n + slackIdx] = 1;
      basis.push(n + slackIdx);
      slackIdx++;
    } else {
      tRow[n + numNoArtSlack + artIdx] = 1;
      basis.push(n + numNoArtSlack + artIdx);
      artIdx++;
    }
    tRow[totalCols - 1] = rhs;
    tableau.push(tRow);
  }

  // Objective row: minimize c·x + M * sum(artificials)
  const objRow = Array(totalCols).fill(0);
  for (let j = 0; j < n; j++) objRow[j] = cShifted[j];
  for (let j = n + numNoArtSlack; j < n + numNoArtSlack + numArt; j++) {
    objRow[j] = BIG_M;
  }
  // Subtract contribution of artificial variables in basis from objective
  for (let i = 0; i < m; i++) {
    if (basis[i] >= n + numNoArtSlack) {
      // This is an artificial variable in basis
      const coeff = objRow[basis[i]];
      if (Math.abs(coeff) > EPS) {
        for (let j = 0; j < totalCols; j++) {
          objRow[j] -= coeff * tableau[i][j];
        }
      }
    }
  }

  // Simplex iterations
  let iterations = 0;

  while (iterations < MAX_ITER) {
    iterations++;

    // Find entering variable (most negative reduced cost)
    let enterCol = -1;
    let minCost = -EPS;
    for (let j = 0; j < totalCols - 1; j++) {
      if (objRow[j] < minCost) {
        minCost = objRow[j];
        enterCol = j;
      }
    }

    if (enterCol === -1) break; // Optimal

    // Find leaving variable (minimum ratio test)
    let leaveRow = -1;
    let minRatio = Infinity;
    for (let i = 0; i < m; i++) {
      if (tableau[i][enterCol] > EPS) {
        const ratio = tableau[i][totalCols - 1] / tableau[i][enterCol];
        if (ratio < minRatio - EPS) {
          minRatio = ratio;
          leaveRow = i;
        }
      }
    }

    if (leaveRow === -1) {
      return { status: 'UNBOUNDED', message: 'Problem is unbounded', iterations };
    }

    // Pivot
    pivot(tableau, objRow, leaveRow, enterCol, m, totalCols);
    basis[leaveRow] = enterCol;
  }

  // Check if artificial variables are still in basis (infeasible)
  for (let i = 0; i < m; i++) {
    if (basis[i] >= n + numNoArtSlack && tableau[i][totalCols - 1] > EPS) {
      return { status: 'INFEASIBLE', message: 'No feasible solution exists', iterations };
    }
  }

  // Extract solution
  const x = Array(n).fill(0);
  for (let i = 0; i < m; i++) {
    if (basis[i] < n) {
      x[basis[i]] = tableau[i][totalCols - 1];
    }
  }

  // Add back lower bounds
  for (let i = 0; i < n; i++) {
    x[i] += lowerBounds[i];
    // Clamp to bounds
    x[i] = Math.max(lowerBounds[i], Math.min(x[i], upperBounds[i]));
    if (x[i] < EPS) x[i] = 0;
  }

  const objectiveValue = c.reduce((sum, ci, i) => sum + ci * x[i], 0);

  return { status: 'OPTIMAL', x, objectiveValue, iterations };
}

function pivot(
  tableau: number[][],
  objRow: number[],
  pivotRow: number,
  pivotCol: number,
  m: number,
  totalCols: number
): void {
  const pivotVal = tableau[pivotRow][pivotCol];
  // Normalize pivot row
  for (let j = 0; j < totalCols; j++) {
    tableau[pivotRow][j] /= pivotVal;
  }
  // Eliminate from other rows
  for (let i = 0; i < m; i++) {
    if (i !== pivotRow && Math.abs(tableau[i][pivotCol]) > EPS) {
      const factor = tableau[i][pivotCol];
      for (let j = 0; j < totalCols; j++) {
        tableau[i][j] -= factor * tableau[pivotRow][j];
      }
    }
  }
  // Eliminate from objective row
  if (Math.abs(objRow[pivotCol]) > EPS) {
    const factor = objRow[pivotCol];
    for (let j = 0; j < totalCols; j++) {
      objRow[j] -= factor * tableau[pivotRow][j];
    }
  }
}
