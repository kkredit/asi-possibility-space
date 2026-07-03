import type { Action, Credences, Dataset, Evaluator, StateId, SubCredences, ValueVector } from '@model/types';
import { analyze } from '@engine/analyze';
import { deriveCredences, derivedFactorIds } from '@engine/derive';
import type { Pins } from '@engine/scenarios';

/**
 * Set one state's probability to `value` (clamped to [0, 1]), redistributing the
 * remaining mass across the other states in proportion to their prior weights.
 * The one marginal-shift rule shared by actions and belief-threshold sweeps.
 */
export function withMarginal(
  dist: Record<StateId, number>,
  state: StateId,
  value: number,
): Record<StateId, number> {
  const v = Math.max(0, Math.min(1, value));
  const others = Object.keys(dist).filter((s) => s !== state);
  const priorOthers = others.reduce((a, s) => a + dist[s], 0);
  const remaining = 1 - v;
  const out: Record<StateId, number> = { [state]: v };
  for (const s of others) out[s] = priorOthers > 0 ? remaining * (dist[s] / priorOthers) : remaining / others.length;
  return out;
}

/**
 * Apply an action's deltas to a copy of the credences. Each delta moves
 * probability mass toward a target state by its magnitude; the remaining mass is
 * redistributed across the other states in proportion to their prior weights.
 */
export function applyAction(credences: Credences, action: Action): Credences {
  const next: Credences = {};
  for (const fid of Object.keys(credences)) next[fid] = { ...credences[fid] };

  for (const delta of action.deltas) {
    const dist = next[delta.factor];
    if (!dist || dist[delta.towardState] === undefined) continue;
    next[delta.factor] = withMarginal(dist, delta.towardState, dist[delta.towardState] + delta.magnitude);
  }
  return next;
}

/**
 * Apply an action with the sub-layer ACTIVE: sub-deltas shift the sub-credences
 * and the derived parents are recomputed; factor deltas on the derived parents are
 * the detached-mode fallback and are skipped (the sub-layer owns those factors);
 * deltas on any other factor apply as usual.
 */
export function applyActionWithSubfactors(
  dataset: Dataset,
  credences: Credences,
  subCredences: SubCredences,
  action: Action,
): { credences: Credences; subCredences: SubCredences } {
  const derived = derivedFactorIds(dataset);
  let sub = subCredences;
  if (action.subDeltas?.length) {
    sub = { ...subCredences };
    for (const d of action.subDeltas) {
      const dist = sub[d.subfactor];
      if (!dist || dist[d.towardState] === undefined) continue;
      sub[d.subfactor] = withMarginal(dist, d.towardState, dist[d.towardState] + d.magnitude);
    }
  }
  let cred: Credences = { ...credences };
  for (const delta of action.deltas) {
    if (derived.has(delta.factor)) continue;
    const dist = cred[delta.factor];
    if (!dist || dist[delta.towardState] === undefined) continue;
    cred[delta.factor] = withMarginal(dist, delta.towardState, dist[delta.towardState] + delta.magnitude);
  }
  cred = deriveCredences(dataset, cred, sub);
  return { credences: cred, subCredences: sub };
}

/**
 * The shifted credences an action produces — sub-aware when `subCredences` is
 * supplied (the derived parents re-derive), plain marginal shifts otherwise.
 */
export function shiftedCredences(
  dataset: Dataset,
  credences: Credences,
  action: Action,
  subCredences?: SubCredences,
): Credences {
  return subCredences
    ? applyActionWithSubfactors(dataset, credences, subCredences, action).credences
    : applyAction(credences, action);
}

export interface RankedAction {
  action: Action;
  ev: number;
  evGain: number;
  evVector: ValueVector;
}

/**
 * Rank actions by the EV gain they produce vs. the baseline (no action).
 * Ranked by raw EV gain — no cost term yet (see design doc §9.5).
 */
export function rankActions(
  dataset: Dataset,
  credences: Credences,
  weights: ValueVector,
  evaluator: Evaluator,
  pins: Pins = {},
  /** When supplied, actions with subDeltas act through the sub-layer (and the
   *  derived parents re-derive) instead of nudging parent marginals directly. */
  subCredences?: SubCredences,
): { baselineEv: number; ranked: RankedAction[] } {
  const baselineEv = analyze(dataset, credences, weights, evaluator, pins).ev;
  const ranked = dataset.actions
    .map((action) => {
      const result = analyze(dataset, shiftedCredences(dataset, credences, action, subCredences), weights, evaluator, pins);
      return { action, ev: result.ev, evGain: result.ev - baselineEv, evVector: result.evVector };
    })
    .sort((a, b) => b.evGain - a.evGain);
  return { baselineEv, ranked };
}
