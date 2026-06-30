import type { Credences, Dataset, Evaluator, FactorKind, Scenario, ValueVector } from '@model/types';
import { analyze } from '@engine/analyze';
import type { Pins } from '@engine/scenarios';

export interface SensitivityRow {
  factorId: string;
  label: string;
  kind: FactorKind;
  /** EV when this factor is pinned to its best/worst state, others left as-is. */
  evLow: number;
  evHigh: number;
  bestStateId: string;
  worstStateId: string;
  /** evHigh - evLow: how much EV swings across this factor's states. */
  swing: number;
}

/**
 * Tornado sensitivity: for each factor, pin it to each of its states (keeping the
 * other factors' credences) and record the EV range. The swing tells you how much
 * your expected value hinges on that one factor. Interpretation depends on kind:
 *  - influenceable -> where to ACT
 *  - objective     -> where forecasting has the most VALUE OF INFORMATION
 *  - contingent    -> where SITUATIONAL AWARENESS matters
 */
export function sensitivity(
  dataset: Dataset,
  credences: Credences,
  weights: ValueVector,
  evaluator: Evaluator,
  pins: Pins = {},
  /** Optional joint (e.g. the soft-evidence reconciled joint). Forwarded to analyze,
   *  which conditions it on each pinned state. */
  jointProbability?: (s: Scenario) => number,
): SensitivityRow[] {
  const rows: SensitivityRow[] = [];

  for (const factor of dataset.factors) {
    if (pins[factor.id]) continue; // pinned factors have no swing

    let evLow = Infinity;
    let evHigh = -Infinity;
    let bestStateId = factor.states[0].id;
    let worstStateId = factor.states[0].id;

    for (const state of factor.states) {
      const ev = analyze(dataset, credences, weights, evaluator, {
        ...pins,
        [factor.id]: state.id,
      }, undefined, jointProbability).ev;
      if (ev > evHigh) {
        evHigh = ev;
        bestStateId = state.id;
      }
      if (ev < evLow) {
        evLow = ev;
        worstStateId = state.id;
      }
    }

    rows.push({
      factorId: factor.id,
      label: factor.label,
      kind: factor.kind,
      evLow,
      evHigh,
      bestStateId,
      worstStateId,
      swing: evHigh - evLow,
    });
  }

  return rows.sort((a, b) => b.swing - a.swing);
}
