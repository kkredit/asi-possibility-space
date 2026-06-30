import type { Action, Credences, Dataset, Evaluator, ValueVector } from '@model/types';
import { analyze } from '@engine/analyze';
import type { Pins } from '@engine/scenarios';

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

    const target = Math.max(0, Math.min(1, dist[delta.towardState] + delta.magnitude));
    const others = Object.keys(dist).filter((s) => s !== delta.towardState);
    const remaining = 1 - target;
    const priorOthers = others.reduce((sum, s) => sum + dist[s], 0);

    dist[delta.towardState] = target;
    for (const s of others) {
      dist[s] = priorOthers > 0 ? remaining * (dist[s] / priorOthers) : remaining / others.length;
    }
  }
  return next;
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
): { baselineEv: number; ranked: RankedAction[] } {
  const baselineEv = analyze(dataset, credences, weights, evaluator, pins).ev;
  const ranked = dataset.actions
    .map((action) => {
      const result = analyze(dataset, applyAction(credences, action), weights, evaluator, pins);
      return { action, ev: result.ev, evGain: result.ev - baselineEv, evVector: result.evVector };
    })
    .sort((a, b) => b.evGain - a.evGain);
  return { baselineEv, ranked };
}
