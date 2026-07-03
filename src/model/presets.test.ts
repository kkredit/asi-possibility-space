import { describe, expect, it } from 'vitest';
import { dataset } from '@model/dataset';
import type { Credences } from '@model/types';
import type { KnownFactorId } from '@model/ids';
import { presets } from '@model/presets';
import { deriveCredences } from '@engine/derive';
import { VALUE_DIMENSION_IDS } from '@engine/value';
import type { SubCredences } from '@model/types';

describe('belief presets', () => {
  it('have unique ids', () => {
    const ids = presets.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cover every factor with valid states that sum to 1 (unstated fall back to baseline)', () => {
    for (const p of presets) {
      // What the app actually applies: the preset over the dataset baseline, so a
      // factor a preset doesn't state (e.g. coordination) inherits the baseline.
      const effective: Credences = { ...dataset.baselineCredences, ...p.credences };
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

  it('have per-factor accuracy in [0,1] and non-negative weights on all dimensions', () => {
    for (const p of presets) {
      for (const [fid, view] of Object.entries(p.factors)) {
        expect(view!.accuracy, `${p.id}/${fid} accuracy`).toBeGreaterThanOrEqual(0);
        expect(view!.accuracy, `${p.id}/${fid} accuracy`).toBeLessThanOrEqual(1);
        const known =
          dataset.factors.some((f) => f.id === fid) ||
          (dataset.subfactors ?? []).some((sf) => sf.id === fid);
        expect(known, `${p.id} unknown factor ${fid}`).toBe(true);
      }
      if (p.weights) {
        for (const dim of VALUE_DIMENSION_IDS) {
          expect(p.weights[dim], `${p.id} weight ${dim}`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('reference every current factor, each with a note', () => {
    for (const p of presets) {
      for (const factor of dataset.factors) {
        const view = p.factors[factor.id as KnownFactorId];
        expect(view, `${p.id} missing factor view ${factor.id}`).toBeDefined();
        expect(view!.note.length, `${p.id}/${factor.id} empty note`).toBeGreaterThan(0);
      }
    }
  });

  it('cite https references; factor refs are valid 1-based indices', () => {
    for (const p of presets) {
      expect(p.references.length, `${p.id} has no references`).toBeGreaterThan(0);
      for (const ref of p.references) {
        expect(ref.url, `${p.id} reference "${ref.label}"`).toMatch(/^https:\/\//);
      }
      for (const [fid, view] of Object.entries(p.factors)) {
        for (const r of view!.refs ?? []) {
          expect(r, `${p.id}/${fid} ref ${r} out of range`).toBeGreaterThanOrEqual(1);
          expect(r, `${p.id}/${fid} ref ${r} out of range`).toBeLessThanOrEqual(p.references.length);
        }
      }
    }
  });
});

describe('preset sub-credences (alignment deep dive)', () => {
  it('every subfactor distribution sums to 1 over that subfactor\'s states', () => {
    for (const p of presets) {
      for (const sf of dataset.subfactors ?? []) {
        const dist = (p.subCredences as SubCredences | undefined)?.[sf.id];
        expect(dist, `${p.id} missing subCredences.${sf.id}`).toBeDefined();
        const ids = sf.states.map((s) => s.id);
        for (const sid of Object.keys(dist!)) expect(ids).toContain(sid);
        const sum = Object.values(dist!).reduce((a, b) => a + b, 0);
        expect(sum, `${p.id}/${sf.id} sums to ${sum}`).toBeCloseTo(1, 6);
      }
    }
  });

  it('derived parents stay in the neighborhood of the stated top-level credences', () => {
    // The deep dive is calibrated so each preset's derived tractability /
    // alignment-in-time land NEAR its sourced top-level numbers. Exact agreement is
    // not forced — a residual gap (e.g. LeCun's stated easy-optimism exceeding his
    // specific positions) is the deep dive doing its job — but a blowout means the
    // sub-credences or the derivation drifted.
    for (const p of presets) {
      const stated = { ...dataset.baselineCredences, ...p.credences };
      const subs: SubCredences = { ...dataset.subBaseline!, ...(p.subCredences ?? {}) };
      const d = deriveCredences(dataset, stated, subs);
      const dy = Math.abs(d.alignmentInTime.yes - stated.alignmentInTime.yes);
      expect(dy, `${p.id} alignYes derived-vs-stated gap ${dy.toFixed(2)}`).toBeLessThanOrEqual(0.2);
      const l1 = (['easy', 'hard', 'nearImpossible'] as const).reduce(
        (a, st) => a + Math.abs((d.tractability[st] ?? 0) - (stated.tractability[st] ?? 0)), 0);
      expect(l1, `${p.id} tractability L1 gap ${l1.toFixed(2)}`).toBeLessThanOrEqual(0.9);
    }
  });
});
