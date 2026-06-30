import type { Dataset, Scenario, ValueVector } from '@model/types';
import { isReasoned } from '@engine/evaluators/cached';
import { VALUE_DIMENSION_IDS, zeroVector } from '@engine/value';

/**
 * Least-squares fitting of additive value models against the hand-reasoned cells.
 *
 * The hand-set `linear` evaluator in the dataset has *chosen* coefficients, so its
 * divergence from the cached evaluator conflates two very different things:
 *   (a) genuine factor *interaction* — the structure a sum-of-parts can never capture; and
 *   (b) the coefficients simply being suboptimal.
 *
 * Fitting removes (b). A model fit by least squares to the cached cells is the *best
 * possible* member of its family, so its residual against cached is the part of the
 * surface that family is structurally incapable of representing:
 *   - fitted main-effects residual  → irreducible non-linearity (all interaction).
 *   - fitted pairwise residual      → the part beyond two-way interaction (higher order).
 * The drop between rungs decomposes the variance of the value surface. See docs/MODEL.md.
 *
 * Implementation is dependency-free: one-hot features, ridge-regularised normal
 * equations, solved by Gauss–Jordan. All four value dimensions share one design
 * matrix (same features, different targets), so we factor once and solve four RHS.
 */

/** A fitted additive model over the value dimensions. */
export interface FittedModel {
  predict(scenario: Scenario): ValueVector;
  /** Free parameters per value dimension (for reporting overfit risk). */
  featureCount: number;
  /** Cells the fit was trained on. */
  sampleCount: number;
}

interface FeatureSpec {
  /** Stable, ordered feature descriptors. Index 0 is always the intercept. */
  keys: string[];
  /** Whether each column should be regularised (intercept is not). */
  regularise: boolean[];
  /** Indices of the features that are "on" for a scenario (always includes 0). */
  active(scenario: Scenario): number[];
}

/**
 * Build the feature layout for an additive model. `pairwise` adds an indicator for
 * every (factor_i=state, factor_j=state) co-occurrence (i<j) on top of the main
 * effects, letting the model represent two-way interactions.
 */
function buildFeatureSpec(dataset: Dataset, pairwise: boolean): FeatureSpec {
  const keys: string[] = ['intercept'];
  const regularise: boolean[] = [false];
  const index = new Map<string, number>();

  const mainKey = (fid: string, sid: string) => `m:${fid}=${sid}`;
  const pairKey = (fi: string, si: string, fj: string, sj: string) =>
    `p:${fi}=${si}&${fj}=${sj}`;

  for (const f of dataset.factors) {
    for (const s of f.states) {
      index.set(mainKey(f.id, s.id), keys.length);
      keys.push(mainKey(f.id, s.id));
      regularise.push(true);
    }
  }

  if (pairwise) {
    for (let i = 0; i < dataset.factors.length; i++) {
      for (let j = i + 1; j < dataset.factors.length; j++) {
        const fi = dataset.factors[i];
        const fj = dataset.factors[j];
        for (const si of fi.states) {
          for (const sj of fj.states) {
            const k = pairKey(fi.id, si.id, fj.id, sj.id);
            index.set(k, keys.length);
            keys.push(k);
            regularise.push(true);
          }
        }
      }
    }
  }

  const factorIds = dataset.factors.map((f) => f.id);

  function active(scenario: Scenario): number[] {
    const on = [0]; // intercept
    for (const fid of factorIds) {
      const idx = index.get(mainKey(fid, scenario[fid]));
      if (idx !== undefined) on.push(idx);
    }
    if (pairwise) {
      for (let i = 0; i < factorIds.length; i++) {
        for (let j = i + 1; j < factorIds.length; j++) {
          const fi = factorIds[i];
          const fj = factorIds[j];
          const idx = index.get(pairKey(fi, scenario[fi], fj, scenario[fj]));
          if (idx !== undefined) on.push(idx);
        }
      }
    }
    return on;
  }

  return { keys, regularise, active };
}

/**
 * Solve A·X = B in place for X, where A is n×n and B is n×m (multiple RHS), using
 * Gauss–Jordan elimination with partial pivoting. `a` and `b` are mutated; the
 * solution is returned as `b`. A is symmetric positive-definite here (ridge), so
 * pivots never vanish.
 */
function solveLinearSystem(a: number[][], b: number[][]): number[][] {
  const n = a.length;
  const m = b[0].length;
  for (let col = 0; col < n; col++) {
    // Partial pivot: largest magnitude in this column at or below the diagonal.
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (pivot !== col) {
      [a[col], a[pivot]] = [a[pivot], a[col]];
      [b[col], b[pivot]] = [b[pivot], b[col]];
    }
    const diag = a[col][col];
    for (let c = col; c < n; c++) a[col][c] /= diag;
    for (let c = 0; c < m; c++) b[col][c] /= diag;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = a[r][col];
      if (factor === 0) continue;
      for (let c = col; c < n; c++) a[r][c] -= factor * a[col][c];
      for (let c = 0; c < m; c++) b[r][c] -= factor * b[col][c];
    }
  }
  return b;
}

/** Ridge strength. Small relative to the data scale — just enough to keep the
 * collinear one-hot design matrix invertible without materially biasing the fit. */
const RIDGE_LAMBDA = 1e-3;

/**
 * Fit an additive value model to every hand-reasoned cell in the dataset by ridge
 * least squares. Returns a model whose `predict` is the best additive (or pairwise-
 * additive) approximation of the cached value surface.
 */
export function fitModel(dataset: Dataset, pairwise: boolean): FittedModel {
  const spec = buildFeatureSpec(dataset, pairwise);
  const p = spec.keys.length;
  const dims = VALUE_DIMENSION_IDS;

  // Accumulate the normal equations XᵀX (p×p) and Xᵀy (p×dims) directly from the
  // sparse active-feature lists — no dense design matrix is ever materialised.
  const xtx: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const xty: number[][] = Array.from({ length: p }, () => new Array(dims.length).fill(0));

  let sampleCount = 0;
  for (const cell of dataset.cachedOutcomes) {
    if (!isReasoned(cell.scenario, dataset)) continue; // defensive; cached cells are reasoned
    const on = spec.active(cell.scenario);
    sampleCount++;
    for (let ii = 0; ii < on.length; ii++) {
      const fi = on[ii];
      for (let jj = 0; jj < on.length; jj++) xtx[fi][on[jj]] += 1;
      for (let d = 0; d < dims.length; d++) xty[fi][d] += cell.outcome.value[dims[d]];
    }
  }

  // Ridge: add λ to the diagonal of every regularised (non-intercept) feature.
  for (let i = 0; i < p; i++) if (spec.regularise[i]) xtx[i][i] += RIDGE_LAMBDA;

  // Solve once for all four dimensions: β (p×dims) = (XᵀX + λR)⁻¹ Xᵀy.
  const beta = solveLinearSystem(xtx, xty);

  function predict(scenario: Scenario): ValueVector {
    const on = spec.active(scenario);
    const out: ValueVector = zeroVector();
    for (const fi of on) {
      for (let d = 0; d < dims.length; d++) out[dims[d]] += beta[fi][d];
    }
    return out;
  }

  return { predict, featureCount: p, sampleCount };
}

// Memoise per (dataset, pairwise) — the fit is deterministic and the dataset is
// effectively immutable at runtime, so we only ever solve each system once.
const cache = new WeakMap<Dataset, Partial<Record<'main' | 'pairwise', FittedModel>>>();

export function fittedModel(dataset: Dataset, pairwise: boolean): FittedModel {
  let entry = cache.get(dataset);
  if (!entry) cache.set(dataset, (entry = {}));
  const key = pairwise ? 'pairwise' : 'main';
  return (entry[key] ??= fitModel(dataset, pairwise));
}

/** Test-only handle on the internal Gauss–Jordan solver fitModel relies on. */
export const solveForTest = solveLinearSystem;
