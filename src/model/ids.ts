import type { ValueVector } from './types';

/**
 * The canonical factor/state id vocabulary — the single source of truth for the
 * CONTENT's identifiers.
 *
 * `types.ts` stays content-agnostic (`FactorId`/`StateId` are plain strings, so the
 * engine works over any factor set); this module pins the ids the *authored* content
 * uses, so typos and omissions are compile errors. Adding a factor or state here
 * ripples as a TS error through everything that must keep up: `factorDefs`,
 * `baselineCredences`, `linearContributions`, the couplings, the Bayes net,
 * `factorBackgrounds`, and every preset's credences.
 */
export const FACTOR_STATES = {
  orthogonality: ['holds', 'fails'],
  tractability: ['easy', 'hard', 'nearImpossible'],
  offenseDefense: ['offense', 'balanced', 'defense'],
  takeoff: ['fast', 'medium', 'slow'],
  powerConcentration: ['concentrated', 'diffuse'],
  alignmentInTime: ['yes', 'no'],
  controlDeployed: ['yes', 'no'],
  coordination: ['regime', 'none'],
  deception: ['deceptive', 'faithful'],
} as const;

export type KnownFactorId = keyof typeof FACTOR_STATES;
export type StateOf<F extends KnownFactorId> = (typeof FACTOR_STATES)[F][number];

/** All known factor ids, in canonical (display) order. */
export const FACTOR_IDS = Object.keys(FACTOR_STATES) as KnownFactorId[];

/** A (factor, state) pair where the state provably belongs to the factor. */
export type KnownFactorState = {
  [F in KnownFactorId]: { factor: F; state: StateOf<F> };
}[KnownFactorId];

/** Content-typed credences: every known factor, every state, no strays. */
export type KnownCredences = { [F in KnownFactorId]: Record<StateOf<F>, number> };

/** Content-typed linear contributions: a (possibly empty) vector per factor-state. */
export type KnownLinearContributions = {
  [F in KnownFactorId]: { [S in StateOf<F>]: Partial<ValueVector> };
};

/**
 * The alignment SUB-LAYER id vocabulary. Subfactors are belief-layer citizens
 * (sliders, presets, backgrounds, actions, tornado rows) that DERIVE the two
 * parent factors' credences — they do not multiply the 1,728-scenario space.
 * Objective subfactors decompose "how hard is alignment" (→ tractability);
 * influenceable research areas decompose "do we land it in time"
 * (→ alignmentInTime), each gated by its objective twin.
 */
export const SUBFACTOR_STATES = {
  // objective: the problem
  interpLegibility: ['legible', 'partially', 'opaque'],
  valueSpec: ['learnable', 'brittle'],
  corrigibility: ['broadBasin', 'narrow', 'antiNatural'],
  oversightScaling: ['scales', 'fails'],
  // influenceable: the effort (state = maturity at ASI onset)
  interpResearch: ['mature', 'partial', 'nascent'],
  oversightResearch: ['mature', 'partial', 'nascent'],
  theoryResearch: ['mature', 'partial', 'nascent'],
  evalsResearch: ['mature', 'partial', 'nascent'],
} as const;

export type KnownSubfactorId = keyof typeof SUBFACTOR_STATES;
export type SubStateOf<S extends KnownSubfactorId> = (typeof SUBFACTOR_STATES)[S][number];

/** All known subfactor ids, in canonical (display) order. */
export const SUBFACTOR_IDS = Object.keys(SUBFACTOR_STATES) as KnownSubfactorId[];

/** Content-typed sub-credences: every subfactor, every state, no strays. */
export type KnownSubCredences = { [S in KnownSubfactorId]: Record<SubStateOf<S>, number> };
