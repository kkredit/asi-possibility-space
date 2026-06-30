import { describe, expect, it } from 'vitest';
import { dataset } from '@model/dataset';
import { presets } from '@model/presets';
import { VALUE_DIMENSION_IDS } from '@engine/value';

describe('belief presets', () => {
  it('have unique ids', () => {
    const ids = presets.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cover every factor with valid states that sum to 1 (unstated fall back to baseline)', () => {
    for (const p of presets) {
      // What the app actually applies: the preset over the dataset baseline, so a
      // factor a preset doesn't state (e.g. coordination) inherits the baseline.
      const effective = { ...dataset.baselineCredences, ...p.credences };
      for (const factor of dataset.factors) {
        const dist = effective[factor.id];
        expect(dist, `${p.id} missing ${factor.id}`).toBeDefined();
        const stateIds = factor.states.map((s) => s.id);
        for (const sid of Object.keys(dist)) expect(stateIds).toContain(sid);
        const sum = Object.values(dist).reduce((a, b) => a + b, 0);
        expect(sum, `${p.id}/${factor.id} sums to ${sum}`).toBeCloseTo(1, 6);
      }
    }
  });

  it('have accuracy in [0,1] and non-negative weights on all dimensions', () => {
    for (const p of presets) {
      expect(p.accuracy).toBeGreaterThanOrEqual(0);
      expect(p.accuracy).toBeLessThanOrEqual(1);
      if (p.weights) {
        for (const dim of VALUE_DIMENSION_IDS) {
          expect(p.weights[dim], `${p.id} weight ${dim}`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('each cite at least one https source', () => {
    for (const p of presets) {
      expect(p.citations.length, `${p.id} has no citations`).toBeGreaterThan(0);
      for (const cit of p.citations) {
        expect(cit.url, `${p.id} citation "${cit.label}"`).toMatch(/^https:\/\//);
      }
    }
  });
});
