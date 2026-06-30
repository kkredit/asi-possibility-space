import { afterEach, describe, expect, it } from 'vitest';
import { useBeliefs } from '@shell/store';
import { presets } from '@model/presets';

const s = () => useBeliefs.getState();

afterEach(() => s().reset());

describe('belief store — probability model', () => {
  it('defaults to independence with no reconciled joint', () => {
    expect(s().probabilityModel).toBe('independence');
    expect(s().bayesProbability).toBeNull();
  });

  it('switching to Bayes net populates the reconciled marginals and joint', () => {
    s().setProbabilityModel('bayesNet');
    expect(s().probabilityModel).toBe('bayesNet');
    expect(typeof s().bayesProbability).toBe('function');
    // Every factor has a full marginal that sums to ~1.
    for (const f of Object.keys(s().bayesMarginals)) {
      const sum = Object.values(s().bayesMarginals[f]).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 6);
    }
  });

  it('soft evidence on a child re-rakes its parents (HELD vs FLOAT)', () => {
    s().setProbabilityModel('bayesNet');
    const beforeSlow = s().bayesMarginals.takeoff.slow;
    // Slide alignment-in-time = yes way up.
    s().setMarginalTarget('alignmentInTime', 'yes', 0.95);
    // The touched factor is held at (about) the target…
    expect(s().bayesMarginals.alignmentInTime.yes).toBeGreaterThan(0.9);
    expect(s().targets.alignmentInTime).toBeDefined();
    // …and its untouched parent floats upward (slow takeoff makes alignment likely).
    expect(s().bayesMarginals.takeoff.slow).toBeGreaterThan(beforeSlow);
    expect(s().targets.takeoff).toBeUndefined();
  });

  it('reset releases soft evidence but stays in Bayes-net mode', () => {
    s().setProbabilityModel('bayesNet');
    s().setMarginalTarget('alignmentInTime', 'yes', 0.95);
    s().reset();
    expect(s().probabilityModel).toBe('bayesNet');
    expect(Object.keys(s().targets)).toHaveLength(0);
  });

  it('applying a preset drops back to independence', () => {
    s().setProbabilityModel('bayesNet');
    s().applyPreset(presets[0].id);
    expect(s().probabilityModel).toBe('independence');
    expect(s().bayesProbability).toBeNull();
    expect(s().activePresetId).toBe(presets[0].id);
  });
});
