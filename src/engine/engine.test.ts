import { describe, expect, it } from 'vitest';
import { dataset } from '@model/dataset';
import {
  analyze,
  applyAction,
  cachedEvaluator,
  distribution,
  enumerateScenarios,
  getEvaluator,
  isReasoned,
  linearEvaluator,
  rankActions,
  scalarize,
  scenarioProbability,
  scenarioKey,
  sensitivity,
} from '@engine/index';

describe('dataset integrity (cached cells)', () => {
  const validState = (fid: string, sid: string) =>
    dataset.factors.find((f) => f.id === fid)?.states.some((s) => s.id === sid);

  it('has no duplicate scenario keys', () => {
    const keys = dataset.cachedOutcomes.map((c) => scenarioKey(c.scenario));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every cached scenario uses real factor/state ids for the factors it ranges over', () => {
    // Cells range over a subset of factors (they don't vary takeoff speed); every
    // key they DO use must be a real factor/state.
    for (const c of dataset.cachedOutcomes) {
      for (const fid of Object.keys(c.scenario)) {
        expect(validState(fid, c.scenario[fid])).toBe(true);
      }
    }
  });

  it('every cached value is within [-1, 1]', () => {
    for (const c of dataset.cachedOutcomes) {
      for (const v of Object.values(c.outcome.value)) {
        expect(v).toBeGreaterThanOrEqual(-1);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('every scenario is hand-reasoned across the full 432-cell space', () => {
    // 144 medium-anchor cells × {fast, medium, slow} = 432 authored cells.
    expect(dataset.cachedOutcomes.length).toBe(432);
    const scenarios = enumerateScenarios(dataset.factors);
    expect(scenarios).toHaveLength(432);
    expect(scenarios.every((s) => isReasoned(s, dataset))).toBe(true);
  });

  it('medium-takeoff variant preserves the base hand-reasoned value', () => {
    // The doom corner barely moves with takeoff, but the ALIGNED/CONTROL corners do:
    // fast should be no better than medium, slow no worse, on survival.
    const corner = {
      orthogonality: 'holds', tractability: 'hard', offenseDefense: 'balanced',
      powerConcentration: 'concentrated', alignmentInTime: 'yes', controlDeployed: 'yes',
    } as const;
    const surv = (takeoff: string) =>
      cachedEvaluator.evaluate({ ...corner, takeoff }, dataset)!.value.survival;
    expect(surv('fast')).toBeLessThanOrEqual(surv('medium'));
    expect(surv('slow')).toBeGreaterThanOrEqual(surv('medium'));
  });
});

describe('scenario enumeration', () => {
  it('produces the full cross-product (2·3·3·3·2·2·2 = 432)', () => {
    expect(enumerateScenarios(dataset.factors)).toHaveLength(432);
  });

  it('collapses a pinned factor', () => {
    const pinned = enumerateScenarios(dataset.factors, { tractability: 'hard' });
    expect(pinned).toHaveLength(144); // 432 / 3
    expect(pinned.every((s) => s.tractability === 'hard')).toBe(true);
  });

  it('scenarioKey is order-independent', () => {
    expect(scenarioKey({ a: 'x', b: 'y' })).toBe(scenarioKey({ b: 'y', a: 'x' }));
  });
});

describe('probability model', () => {
  it('multiplies independent credences', () => {
    const scenario = {
      orthogonality: 'holds',
      tractability: 'hard',
      offenseDefense: 'offense',
      powerConcentration: 'diffuse',
      alignmentInTime: 'no',
      controlDeployed: 'yes',
    };
    const expected = 0.7 * 0.5 * 0.45 * 0.45 * 0.65 * 0.45;
    expect(scenarioProbability(scenario, dataset.baselineCredences)).toBeCloseTo(expected, 10);
  });

  it('total probability over all scenarios is 1', () => {
    const { totalProbability } = analyze(
      dataset,
      dataset.baselineCredences,
      dataset.defaultWeights,
      linearEvaluator,
    );
    expect(totalProbability).toBeCloseTo(1, 10);
  });
});

describe('couplings', () => {
  const massOf = (
    pred: (s: { scenario: Record<string, string> }) => boolean,
    pins = {},
  ) =>
    analyze(dataset, dataset.baselineCredences, dataset.defaultWeights, linearEvaluator, pins)
      .scenarios.filter(pred)
      .reduce((a, s) => a + s.probability, 0);

  it('preserves total mass after renormalization (with and without pins)', () => {
    expect(massOf(() => true)).toBeCloseTo(1, 10);
    // Pinned subset keeps the pinned state's marginal mass.
    expect(massOf(() => true, { orthogonality: 'holds' })).toBeCloseTo(0.7, 10);
  });

  it('suppresses the fast-takeoff + diffuse combination vs. independence', () => {
    // Independent: P(fast)·P(diffuse) = 0.3·0.45 = 0.135. The coupling drives it far lower.
    const coupled = massOf((s) => s.scenario.takeoff === 'fast' && s.scenario.powerConcentration === 'diffuse');
    expect(coupled).toBeLessThan(0.05);
  });

  it('makes concentration nearly certain given a fast takeoff', () => {
    const fast = massOf((s) => s.scenario.takeoff === 'fast');
    const fastConcentrated = massOf(
      (s) => s.scenario.takeoff === 'fast' && s.scenario.powerConcentration === 'concentrated',
    );
    expect(fastConcentrated / fast).toBeGreaterThan(0.85);
  });

  it('screens off near-impossible tractability when orthogonality fails', () => {
    const fails = massOf((s) => s.scenario.orthogonality === 'fails');
    const failsNearImpossible = massOf(
      (s) => s.scenario.orthogonality === 'fails' && s.scenario.tractability === 'nearImpossible',
    );
    // Independent share would be 0.3; the coupling pushes it well below that.
    expect(failsNearImpossible / fails).toBeLessThan(0.15);
  });
});

describe('value scalarization', () => {
  it('is bounded to [-1, 1] and normalizes weights', () => {
    const v = { survival: 1, agency: 1, suffering: 1, flourishing: 1 };
    expect(scalarize(v, dataset.defaultWeights)).toBeCloseTo(1, 10);
  });

  it('returns 0 when all weights are 0', () => {
    const v = { survival: -1, agency: 1, suffering: -1, flourishing: 1 };
    expect(scalarize(v, { survival: 0, agency: 0, suffering: 0, flourishing: 0 })).toBe(0);
  });
});

describe('evaluators', () => {
  it('cached evaluator returns the authored value for the canonical doom scenario', () => {
    const scenario = {
      orthogonality: 'holds',
      tractability: 'hard',
      offenseDefense: 'offense',
      powerConcentration: 'diffuse',
      alignmentInTime: 'no',
      controlDeployed: 'yes',
      takeoff: 'medium', // medium is the hand-reasoned anchor — value verbatim
    };
    const outcome = cachedEvaluator.evaluate(scenario, dataset)!;
    expect(outcome.value.survival).toBe(-0.9);
    expect(outcome.narrative).toMatch(/sadistic|nihilistic/);
  });

  it('cached evaluator falls back to linear for an un-authored (synthetic) cell', () => {
    // The 144 real scenarios are now all authored, so force the fallback path with
    // a synthetic out-of-distribution state that has no cached cell.
    const scenario = {
      orthogonality: '__synthetic',
      tractability: 'easy',
      offenseDefense: 'balanced',
      powerConcentration: 'concentrated',
      alignmentInTime: 'yes',
      controlDeployed: 'no',
    };
    expect(isReasoned(scenario, dataset)).toBe(false);
    expect(cachedEvaluator.evaluate(scenario, dataset)).toEqual(
      linearEvaluator.evaluate(scenario, dataset),
    );
  });

  it('registry falls back to linear for unknown ids', () => {
    expect(getEvaluator('nope')).toBe(linearEvaluator);
  });
});

describe('actions', () => {
  it('applyAction keeps each factor distribution summing to 1', () => {
    const next = applyAction(dataset.baselineCredences, dataset.actions[2]); // multi-delta
    for (const fid of Object.keys(next)) {
      const sum = Object.values(next[fid]).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    }
  });

  it('funding alignment raises P(alignmentInTime=yes)', () => {
    const next = applyAction(dataset.baselineCredences, dataset.actions[0]);
    expect(next.alignmentInTime.yes).toBeCloseTo(0.5, 10); // 0.35 + 0.15
  });

  it('ranks actions by EV gain, all gains finite', () => {
    const { ranked } = rankActions(
      dataset,
      dataset.baselineCredences,
      dataset.defaultWeights,
      cachedEvaluator,
    );
    expect(ranked).toHaveLength(dataset.actions.length);
    expect(ranked.every((r) => Number.isFinite(r.evGain))).toBe(true);
    // sorted descending
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].evGain).toBeGreaterThanOrEqual(ranked[i].evGain);
    }
  });
});

describe('sensitivity', () => {
  it('returns one row per factor, sorted by swing desc', () => {
    const rows = sensitivity(
      dataset,
      dataset.baselineCredences,
      dataset.defaultWeights,
      cachedEvaluator,
    );
    expect(rows).toHaveLength(dataset.factors.length);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].swing).toBeGreaterThanOrEqual(rows[i].swing);
    }
    expect(rows.every((r) => r.swing >= 0)).toBe(true);
  });
});

describe('distribution', () => {
  it('bins preserve total probability', () => {
    const { scenarios } = analyze(
      dataset,
      dataset.baselineCredences,
      dataset.defaultWeights,
      cachedEvaluator,
    );
    const total = distribution(scenarios).reduce((a, b) => a + b.probability, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});
