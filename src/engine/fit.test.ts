import { describe, expect, it } from 'vitest';
import { dataset } from '@model/dataset';
import {
  cachedEvaluator,
  enumerateScenarios,
  fitModel,
  fittedModel,
  linearEvaluator,
  solveForTest,
  VALUE_DIMENSION_IDS,
} from '@engine/index';
import { fittedLinearEvaluator, fittedPairwiseEvaluator } from '@engine/evaluators/fitted';
import { archetypeEvaluator } from '@engine/evaluators/archetype';
import type { Evaluator, Scenario } from '@model/types';

/** Root-mean-square distance between an evaluator and the cached surface, in
 *  value-vector space, over every scenario. This is exactly what the fitted
 *  models minimise, so it's the right yardstick for "best fit". */
function rmsToCached(ev: Evaluator): number {
  const scenarios = enumerateScenarios(dataset.factors);
  let sse = 0;
  for (const s of scenarios) {
    const a = ev.evaluate(s, dataset)!.value;
    const b = cachedEvaluator.evaluate(s, dataset)!.value;
    for (const d of VALUE_DIMENSION_IDS) sse += (a[d] - b[d]) ** 2;
  }
  return Math.sqrt(sse / (scenarios.length * VALUE_DIMENSION_IDS.length));
}

describe('linear solver', () => {
  it('solves a known dense system A·x = b (solution [2, 3, -1])', () => {
    const a = [
      [2, 1, -1],
      [-3, -1, 2],
      [-2, 1, 2],
    ];
    const b = [[8], [-11], [-3]];
    const x = solveForTest(a, b);
    expect(x[0][0]).toBeCloseTo(2, 6);
    expect(x[1][0]).toBeCloseTo(3, 6);
    expect(x[2][0]).toBeCloseTo(-1, 6);
  });

  it('solves multiple right-hand sides at once', () => {
    const a = [
      [2, 0],
      [0, 4],
    ];
    const b = [
      [2, 6],
      [8, 4],
    ];
    const x = solveForTest(a, b);
    expect(x[0][0]).toBeCloseTo(1, 6);
    expect(x[0][1]).toBeCloseTo(3, 6);
    expect(x[1][0]).toBeCloseTo(2, 6);
    expect(x[1][1]).toBeCloseTo(1, 6);
  });
});

describe('fitted models', () => {
  it('fitted main-effects has lower residual to cached than the hand-set linear', () => {
    // The whole point: fitting removes the "bad coefficients" component of the
    // hand-linear residual, leaving only irreducible non-linearity.
    const handRms = rmsToCached(linearEvaluator);
    const fitRms = rmsToCached(fittedLinearEvaluator);
    expect(fitRms).toBeLessThan(handRms);
  });

  it('pairwise fit is at least as good as main-effects, and strictly better here', () => {
    const main = rmsToCached(fittedLinearEvaluator);
    const pair = rmsToCached(fittedPairwiseEvaluator);
    expect(pair).toBeLessThanOrEqual(main + 1e-9);
    expect(pair).toBeLessThan(main); // the surface really does have pairwise structure
  });

  it('reports the expected feature and sample counts', () => {
    const main = fitModel(dataset, false);
    const pair = fitModel(dataset, true);
    // intercept + Σ|states| = 1 + (2+3+3+3+2+2+2+2+2) = 22 main features.
    expect(main.featureCount).toBe(22);
    // + Σ_{i<j} |states_i|·|states_j| pairwise indicators.
    expect(pair.featureCount).toBeGreaterThan(main.featureCount);
    // Trained on every authored cell.
    expect(main.sampleCount).toBe(1728);
    expect(pair.sampleCount).toBe(1728);
  });

  it('predictions are finite and within a sane range before clamping', () => {
    const model = fitModel(dataset, false);
    for (const s of enumerateScenarios(dataset.factors)) {
      const v = model.predict(s);
      for (const d of VALUE_DIMENSION_IDS) {
        expect(Number.isFinite(v[d])).toBe(true);
        expect(Math.abs(v[d])).toBeLessThan(5);
      }
    }
  });

  it('memoises the fit per (dataset, pairwise) flag', () => {
    expect(fittedModel(dataset, false)).toBe(fittedModel(dataset, false));
    expect(fittedModel(dataset, true)).toBe(fittedModel(dataset, true));
    expect(fittedModel(dataset, false)).not.toBe(fittedModel(dataset, true));
  });

  it('is registered and resolvable through the evaluator interface', () => {
    expect(fittedLinearEvaluator.evaluate(enumerateScenarios(dataset.factors)[0], dataset)).toBeDefined();
  });
});

describe('logical-gate (archetype) evaluator', () => {
  const evalAt = (s: Scenario) => archetypeEvaluator.evaluate(s, dataset)!.value;
  const base = enumerateScenarios(dataset.factors)[0];

  it('predicts the same value for every scenario sharing an archetype', () => {
    // DOOM gate: orthogonality holds, neither aligned nor controlled — the value
    // must not depend on the other factors (offense/defense, concentration, takeoff).
    const doomA = evalAt({ ...base, orthogonality: 'holds', alignmentInTime: 'no', controlDeployed: 'no', offenseDefense: 'offense', powerConcentration: 'diffuse', takeoff: 'fast' });
    const doomB = evalAt({ ...base, orthogonality: 'holds', alignmentInTime: 'no', controlDeployed: 'no', offenseDefense: 'defense', powerConcentration: 'concentrated', takeoff: 'slow' });
    expect(doomA).toEqual(doomB);
  });

  it('separates the four archetypes (doom is far worse than benign on survival)', () => {
    const doom = evalAt({ ...base, orthogonality: 'holds', alignmentInTime: 'no', controlDeployed: 'no' });
    const benign = evalAt({ ...base, orthogonality: 'fails' });
    const aligned = evalAt({ ...base, orthogonality: 'holds', alignmentInTime: 'yes' });
    expect(doom.survival).toBeLessThan(benign.survival);
    expect(doom.survival).toBeLessThan(aligned.survival);
  });

  it('eight logical régimes beat the fitted additive model', () => {
    // The headline finding: an 8-cell gate (32 data-derived numbers) explains more of
    // the surface than the best 22-parameter sum-of-factors — the space is gated.
    const gate = rmsToCached(archetypeEvaluator);
    const fittedMain = rmsToCached(fittedLinearEvaluator);
    expect(gate).toBeLessThan(fittedMain);
  });
});
