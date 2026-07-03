import { describe, expect, it } from 'vitest';
import type { Action, Dataset, Derivation, SubCredences, Subfactor } from '@model/types';
import { deriveCredences, deriveFactor } from '@engine/derive';
import { applyActionWithSubfactors } from '@engine/actions';

/** Minimal synthetic dataset: one CPT-derived factor + one gated-odds factor. */
const subfactors: Subfactor[] = [
  {
    id: 'sfA',
    parent: 'hard',
    label: 'Sub A',
    kind: 'objective',
    question: '',
    description: '',
    states: [
      { id: 'good', label: 'Good' },
      { id: 'bad', label: 'Bad' },
    ],
  },
  {
    id: 'sfB',
    parent: 'hard',
    label: 'Sub B',
    kind: 'objective',
    question: '',
    description: '',
    states: [
      { id: 'up', label: 'Up' },
      { id: 'down', label: 'Down' },
    ],
  },
  {
    id: 'area',
    parent: 'solved',
    label: 'Area',
    kind: 'influenceable',
    question: '',
    description: '',
    states: [
      { id: 'mature', label: 'Mature' },
      { id: 'nascent', label: 'Nascent' },
    ],
  },
];

const cptDerivation: Derivation = {
  kind: 'cpt',
  factor: 'hard',
  parents: ['sfA', 'sfB'],
  cpt: {
    'good|up': { lo: 0.9, hi: 0.1 },
    'good|down': { lo: 0.6, hi: 0.4 },
    'bad|up': { lo: 0.4, hi: 0.6 },
    'bad|down': { lo: 0.1, hi: 0.9 },
  },
};

const oddsDerivation: Derivation = {
  kind: 'gatedOdds',
  factor: 'solved',
  yesState: 'yes',
  noState: 'no',
  baseOdds: 1, // 50/50 before the term
  terms: [
    {
      area: 'area',
      gate: 'sfA',
      multipliers: { 'mature|good': 4, 'mature|bad': 1, 'nascent|good': 1, 'nascent|bad': 0.25 },
    },
  ],
};

const dataset = {
  subfactors,
  derivations: [cptDerivation, oddsDerivation],
} as unknown as Dataset;

const sub: SubCredences = {
  sfA: { good: 0.5, bad: 0.5 },
  sfB: { up: 0.5, down: 0.5 },
  area: { mature: 0.5, nascent: 0.5 },
};

describe('sub-layer derivation', () => {
  it('cpt derivation marginalizes the CPT over the sub-credences', () => {
    const d = deriveFactor(cptDerivation, dataset, sub, {});
    // Uniform sub-beliefs → mean of the four rows: lo = (0.9+0.6+0.4+0.1)/4 = 0.5.
    expect(d.lo).toBeCloseTo(0.5, 10);
    expect(d.hi).toBeCloseTo(0.5, 10);
    // Point-mass beliefs reproduce the row exactly.
    const pointy = deriveFactor(cptDerivation, dataset, { ...sub, sfA: { good: 1, bad: 0 }, sfB: { up: 1, down: 0 } }, {});
    expect(pointy.lo).toBeCloseTo(0.9, 10);
  });

  it('cpt derivation always sums to 1', () => {
    const d = deriveFactor(cptDerivation, dataset, { ...sub, sfA: { good: 0.83, bad: 0.17 } }, {});
    expect(d.lo + d.hi).toBeCloseTo(1, 10);
  });

  it('gatedOdds derivation: E[multiplier] scales the base odds', () => {
    const d = deriveFactor(oddsDerivation, dataset, sub, {});
    // E[mult] over uniform area×gate = (4+1+1+0.25)/4 = 1.5625 → odds 1.5625 → p ≈ 0.61.
    expect(d.yes).toBeCloseTo(1.5625 / 2.5625, 10);
    expect(d.yes + d.no).toBeCloseTo(1, 10);
  });

  it('gatedOdds: the gate gates — mature research pays only when the gate is good', () => {
    const matureSub = { ...sub, area: { mature: 1, nascent: 0 } };
    const gateGood = deriveFactor(oddsDerivation, dataset, { ...matureSub, sfA: { good: 1, bad: 0 } }, {});
    const gateBad = deriveFactor(oddsDerivation, dataset, { ...matureSub, sfA: { good: 0, bad: 1 } }, {});
    expect(gateGood.yes).toBeCloseTo(4 / 5, 10); // odds 4
    expect(gateBad.yes).toBeCloseTo(0.5, 10); // odds 1 — no payoff without the gate
  });

  it('deriveCredences overwrites only the derived parents', () => {
    const cred = { hard: { lo: 0.2, hi: 0.8 }, solved: { yes: 0.5, no: 0.5 }, other: { a: 1 } };
    const next = deriveCredences(dataset, cred, sub);
    expect(next.other).toEqual({ a: 1 });
    expect(next.hard.lo).toBeCloseTo(0.5, 10);
    expect(next.solved.yes).toBeGreaterThan(0.5);
  });

  it('applyActionWithSubfactors shifts sub-credences, re-derives, and skips fallback deltas on derived parents', () => {
    const action: Action = {
      id: 'push',
      label: '',
      description: '',
      deltas: [{ factor: 'solved', towardState: 'yes', magnitude: 0.5 }], // detached-mode fallback — must be ignored
      subDeltas: [{ subfactor: 'area', towardState: 'mature', magnitude: 0.3 }],
    };
    const cred = { hard: { lo: 0.5, hi: 0.5 }, solved: { yes: 0.5, no: 0.5 } };
    const before = deriveCredences(dataset, cred, sub);
    const after = applyActionWithSubfactors(dataset, cred, sub, action);
    expect(after.subCredences.area.mature).toBeCloseTo(0.8, 10);
    // More mature research (with a half-good gate) raises P(solved) — but through
    // the derivation, not the fallback delta.
    expect(after.credences.solved.yes).toBeGreaterThan(before.solved.yes);
    expect(after.credences.solved.yes).toBeLessThan(before.solved.yes + 0.5);
  });
});
