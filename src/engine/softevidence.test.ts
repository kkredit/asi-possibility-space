import { describe, expect, it } from 'vitest';
import { dataset } from '@model/dataset';
import { analyze, bayesNetMarginals, cachedEvaluator, reconcileJoint } from '@engine/index';
import type { Marginals } from '@engine/softevidence';

const net = dataset.bayesNet!;
const cr = dataset.baselineCredences;
const factors = dataset.factors;

describe('soft evidence (IPF raking)', () => {
  it('with no targets, reproduces the net marginals and a normalized joint', () => {
    const r = reconcileJoint(net, factors, cr, {});
    const base = bayesNetMarginals(net, factors, cr);
    for (const f of factors) {
      for (const s of f.states) expect(r.marginals[f.id][s.id]).toBeCloseTo(base[f.id][s.id], 8);
    }
    const total = [...r.prob.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('hits a target marginal on a child factor exactly', () => {
    const targets: Marginals = { alignmentInTime: { yes: 0.9, no: 0.1 } };
    const r = reconcileJoint(net, factors, cr, targets);
    expect(r.converged).toBe(true);
    expect(r.marginals.alignmentInTime.yes).toBeCloseTo(0.9, 6);
  });

  it('soft evidence on a child propagates to its parents (the key behavior)', () => {
    // Raising P(alignment-in-time = yes) should raise belief in the conditions that
    // make alignment likely: slower takeoff and easier tractability.
    const base = bayesNetMarginals(net, factors, cr);
    const r = reconcileJoint(net, factors, cr, { alignmentInTime: { yes: 0.9, no: 0.1 } });
    expect(r.marginals.takeoff.slow).toBeGreaterThan(base.takeoff.slow);
    expect(r.marginals.takeoff.fast).toBeLessThan(base.takeoff.fast);
    expect(r.marginals.tractability.easy).toBeGreaterThan(base.tractability.easy);
  });

  it('leaves factors independent of the evidence essentially unmoved', () => {
    // offenseDefense is disconnected from alignment in the net, so evidence on
    // alignment shouldn't move it.
    const base = bayesNetMarginals(net, factors, cr);
    const r = reconcileJoint(net, factors, cr, { alignmentInTime: { yes: 0.9, no: 0.1 } });
    for (const s of factors.find((f) => f.id === 'offenseDefense')!.states) {
      expect(r.marginals.offenseDefense[s.id]).toBeCloseTo(base.offenseDefense[s.id], 6);
    }
  });

  it('satisfies several targets simultaneously', () => {
    const targets: Marginals = {
      takeoff: { fast: 0.1, medium: 0.3, slow: 0.6 },
      controlDeployed: { yes: 0.8, no: 0.2 },
    };
    const r = reconcileJoint(net, factors, cr, targets);
    expect(r.converged).toBe(true);
    expect(r.marginals.takeoff.slow).toBeCloseTo(0.6, 5);
    expect(r.marginals.controlDeployed.yes).toBeCloseTo(0.8, 5);
  });

  it('drives analyze through the reconciled joint (sums to 1, finite EV)', () => {
    const r = reconcileJoint(net, factors, cr, { controlDeployed: { yes: 0.8, no: 0.2 } });
    const a = analyze(dataset, cr, dataset.defaultWeights, cachedEvaluator, {}, r.probability);
    expect(a.totalProbability).toBeCloseTo(1, 8);
    expect(Number.isFinite(a.ev)).toBe(true);
  });
});
