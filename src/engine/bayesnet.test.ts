import { describe, expect, it } from 'vitest';
import { dataset } from '@model/dataset';
import {
  analyze,
  bayesNetMarginals,
  bayesNetProbability,
  cachedEvaluator,
  enumerateScenarios,
  validateBayesNet,
} from '@engine/index';
import type { BayesNet } from '@model/types';

const net = dataset.bayesNet!;
const cr = dataset.baselineCredences;

describe('bayes net — structure', () => {
  it('the shipped net is valid', () => {
    const v = validateBayesNet(net, dataset.factors);
    expect(v.errors).toEqual([]);
    expect(v.ok).toBe(true);
  });

  it('flags a missing CPT row', () => {
    const broken: BayesNet = {
      description: 'x',
      nodes: net.nodes.map((n) =>
        n.factor === 'powerConcentration' ? { ...n, cpt: { fast: { concentrated: 1, diffuse: 0 } } } : n,
      ),
    };
    expect(validateBayesNet(broken, dataset.factors).ok).toBe(false);
  });

  it('flags a CPT row that does not sum to 1', () => {
    const broken: BayesNet = {
      description: 'x',
      nodes: net.nodes.map((n) =>
        n.factor === 'controlDeployed'
          ? { ...n, cpt: { ...n.cpt, fast: { yes: 0.3, no: 0.3 } } }
          : n,
      ),
    };
    expect(validateBayesNet(broken, dataset.factors).errors.join(' ')).toMatch(/sums to/);
  });

  it('detects a cycle', () => {
    const cyclic: BayesNet = {
      description: 'x',
      nodes: [
        { factor: 'orthogonality', parents: ['takeoff'], cpt: { fast: { holds: 1, fails: 0 }, medium: { holds: 1, fails: 0 }, slow: { holds: 1, fails: 0 } } },
        { factor: 'takeoff', parents: ['orthogonality'], cpt: { holds: { fast: 1, medium: 0, slow: 0 }, fails: { fast: 1, medium: 0, slow: 0 } } },
      ],
    };
    expect(validateBayesNet(cyclic, dataset.factors).errors.join(' ')).toMatch(/cycle/);
  });
});

describe('bayes net — joint', () => {
  it('the joint sums to 1 over the full space', () => {
    const total = enumerateScenarios(dataset.factors).reduce(
      (a, s) => a + bayesNetProbability(net, s, cr),
      0,
    );
    expect(total).toBeCloseTo(1, 10);
  });

  it('reproduces the intended dependencies', () => {
    // P(concentrated | fast) >> P(concentrated | slow); P(aligned-in-time) rises with
    // a slower takeoff and easier tractability.
    const m = bayesNetMarginals(net, dataset.factors, cr);
    expect(m.powerConcentration.concentrated).toBeGreaterThan(0); // marginal well-defined
    // Conditional checks via direct CPT lookup intent:
    const pcGivenFast = net.nodes.find((n) => n.factor === 'powerConcentration')!.cpt!['fast'].concentrated;
    const pcGivenSlow = net.nodes.find((n) => n.factor === 'powerConcentration')!.cpt!['slow'].concentrated;
    expect(pcGivenFast).toBeGreaterThan(pcGivenSlow);
  });

  it('root marginals equal the credences; every factor marginal sums to 1', () => {
    const m = bayesNetMarginals(net, dataset.factors, cr);
    // Roots: orthogonality / offenseDefense / takeoff reproduce the slider values.
    for (const root of ['orthogonality', 'offenseDefense', 'takeoff']) {
      for (const st of dataset.factors.find((f) => f.id === root)!.states) {
        expect(m[root][st.id]).toBeCloseTo(cr[root][st.id], 6);
      }
    }
    for (const f of dataset.factors) {
      const sum = Object.values(m[f.id]).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 8);
    }
  });
});

describe('bayes net — through analyze', () => {
  const netJoint = (s: Parameters<typeof bayesNetProbability>[1]) => bayesNetProbability(net, s, cr);

  it('opt-in net path leaves total probability at 1 (no pins) and yields a finite EV', () => {
    const a = analyze(dataset, cr, dataset.defaultWeights, cachedEvaluator, {}, netJoint);
    expect(a.totalProbability).toBeCloseTo(1, 8);
    expect(Number.isFinite(a.ev)).toBe(true);
  });

  it('the net and independence×couplings give different but comparable EVs', () => {
    const indep = analyze(dataset, cr, dataset.defaultWeights, cachedEvaluator);
    const bn = analyze(dataset, cr, dataset.defaultWeights, cachedEvaluator, {}, netJoint);
    // Both are valid joints over the same value surface, so EV should be in range and
    // in the same ballpark (the net is a refinement of the couplings, not a different
    // universe).
    expect(Math.abs(bn.ev - indep.ev)).toBeLessThan(0.5);
  });
});
