import { describe, expect, it } from 'vitest';
import { dataset } from '@model/dataset';
import { beliefThreshold, cachedEvaluator, conditionalContrast, contrastGrid } from '@engine/index';

const cr = dataset.baselineCredences;
const w = dataset.defaultWeights;
const run = (decision: Parameters<typeof conditionalContrast>[4], given = {}) =>
  conditionalContrast(dataset, cr, w, cachedEvaluator, decision, given);

describe('conditional contrast', () => {
  it('a clearly-good lever has positive net delta', () => {
    // Fielding aligned ASI in time should raise EV vs not.
    const c = run({ factor: 'alignmentInTime', toward: 'yes', baseline: 'no' });
    expect(c.netDelta).toBeGreaterThan(0);
  });

  it('reversing toward/baseline negates the net delta', () => {
    const fwd = run({ factor: 'alignmentInTime', toward: 'yes', baseline: 'no' });
    const rev = run({ factor: 'alignmentInTime', toward: 'no', baseline: 'yes' });
    expect(rev.netDelta).toBeCloseTo(-fwd.netDelta, 10);
  });

  it('favorable share is a probability in [0, 1]', () => {
    const c = run({ factor: 'controlDeployed', toward: 'yes', baseline: 'no' });
    expect(c.favorableShare).toBeGreaterThanOrEqual(0);
    expect(c.favorableShare).toBeLessThanOrEqual(1);
  });

  it('cruxes cover every other free factor, with one delta per state', () => {
    const c = run({ factor: 'powerConcentration', toward: 'diffuse', baseline: 'concentrated' });
    const ids = c.cruxes.map((x) => x.factorId);
    expect(ids).not.toContain('powerConcentration'); // the decision factor is excluded
    expect(ids.length).toBe(dataset.factors.length - 1);
    for (const crux of c.cruxes) {
      const factor = dataset.factors.find((f) => f.id === crux.factorId)!;
      expect(crux.states.length).toBe(factor.states.length);
    }
  });

  it('favorable / unfavorable lists partition the signed conditional deltas', () => {
    const c = run({ factor: 'powerConcentration', toward: 'diffuse', baseline: 'concentrated' });
    expect(c.favorableWhen.every((l) => l.delta > 0)).toBe(true);
    expect(c.unfavorableWhen.every((l) => l.delta < 0)).toBe(true);
    // Sorted by magnitude.
    for (let i = 1; i < c.favorableWhen.length; i++) {
      expect(c.favorableWhen[i - 1].delta).toBeGreaterThanOrEqual(c.favorableWhen[i].delta);
    }
  });

  it('open-source (diffuse) is more favorable under defense- than offense-dominance', () => {
    // The design-doc crux: proliferated capability is stabilizing when defense wins,
    // catastrophic (the nihilist's veto) when offense wins.
    const c = run({ factor: 'powerConcentration', toward: 'diffuse', baseline: 'concentrated' });
    const od = c.cruxes.find((x) => x.factorId === 'offenseDefense')!;
    const offense = od.states.find((s) => s.stateId === 'offense')!.delta;
    const defense = od.states.find((s) => s.stateId === 'defense')!.delta;
    expect(defense).toBeGreaterThan(offense);
  });

  it('net delta and favorable share never disagree in sign (interventional contrast)', () => {
    // Regression: the observational version reported +EV with 0% favorable for
    // concentrated-vs-diffuse because pinning reweighted the coupled takeoff factor.
    const decisions: Parameters<typeof conditionalContrast>[4][] = [
      { factor: 'powerConcentration', toward: 'concentrated', baseline: 'diffuse' },
      { factor: 'powerConcentration', toward: 'diffuse', baseline: 'concentrated' },
      { factor: 'controlDeployed', toward: 'yes', baseline: 'no' },
      { factor: 'offenseDefense', toward: 'defense', baseline: 'offense' },
    ];
    for (const d of decisions) {
      const c = run(d);
      if (c.favorableShare === 0) expect(c.netDelta).toBeLessThanOrEqual(0);
      if (c.favorableShare === 1) expect(c.netDelta).toBeGreaterThanOrEqual(0);
      if (c.netDelta > 0) expect(c.favorableShare).toBeGreaterThan(0);
      if (c.netDelta < 0) expect(c.favorableShare).toBeLessThan(1);
    }
  });

  it('a given condition drops that factor from the cruxes', () => {
    const c = run({ factor: 'powerConcentration', toward: 'diffuse', baseline: 'concentrated' }, { offenseDefense: 'defense' });
    expect(c.cruxes.map((x) => x.factorId)).not.toContain('offenseDefense');
  });
});

describe('belief threshold', () => {
  const decision = { factor: 'powerConcentration', toward: 'diffuse', baseline: 'concentrated' } as const;

  it('sweeps P(state) from 0 to 1 and reports the current credence', () => {
    const t = beliefThreshold(dataset, cr, w, cachedEvaluator, decision, 'offenseDefense', 'defense');
    expect(t.points).toHaveLength(51);
    expect(t.points[0].p).toBe(0);
    expect(t.points[50].p).toBe(1);
    expect(t.currentP).toBeCloseTo(cr.offenseDefense.defense, 10);
  });

  it('open-source grows more favorable as defense-dominance becomes more certain', () => {
    // The design-doc crux, as a monotone trend: net delta at P(defense)=1 exceeds P(defense)=0.
    const t = beliefThreshold(dataset, cr, w, cachedEvaluator, decision, 'offenseDefense', 'defense');
    expect(t.points[50].netDelta).toBeGreaterThan(t.points[0].netDelta);
  });

  it('a detected crossing actually separates the sign of the net delta', () => {
    const t = beliefThreshold(dataset, cr, w, cachedEvaluator, decision, 'offenseDefense', 'defense');
    for (const x of t.crossings) {
      expect(x.p).toBeGreaterThanOrEqual(0);
      expect(x.p).toBeLessThanOrEqual(1);
    }
    // The sign at the endpoints must differ iff there's an odd number of crossings.
    const ends = Math.sign(t.points[0].netDelta) !== Math.sign(t.points[50].netDelta);
    if (ends) expect(t.crossings.length % 2).toBe(1);
  });
});

describe('contrast grid', () => {
  it('has dimensions matching the two conditioning factors', () => {
    const g = contrastGrid(dataset, cr, w, cachedEvaluator, { factor: 'powerConcentration', toward: 'diffuse', baseline: 'concentrated' }, 'offenseDefense', 'alignmentInTime')!;
    expect(g.rows.length).toBe(3); // offense / balanced / defense
    expect(g.cols.length).toBe(2); // yes / no
    expect(g.cells.length).toBe(3);
    expect(g.cells[0].length).toBe(2);
  });

  it('returns null for a degenerate (same-factor) grid', () => {
    const g = contrastGrid(dataset, cr, w, cachedEvaluator, { factor: 'powerConcentration', toward: 'diffuse', baseline: 'concentrated' }, 'offenseDefense', 'offenseDefense');
    expect(g).toBeNull();
  });
});
