import type { Credences, Dataset, Evaluator, SubCredences, ValueVector } from '@model/types';
import { analyze } from '@engine/analyze';
import { deriveCredences } from '@engine/derive';
import type { Pins } from '@engine/scenarios';
import type { SensitivityRow } from '@engine/sensitivity';

/**
 * Tornado rows for the subfactors: pin each sub-state (point mass), re-derive the
 * parents, and record the EV range — the same read as the factor tornado, colored
 * by the subfactor's kind (objective ⇒ value of information, influenceable ⇒ act).
 */
export function subfactorSensitivity(
  dataset: Dataset,
  credences: Credences,
  subCredences: SubCredences,
  weights: ValueVector,
  evaluator: Evaluator,
  pins: Pins = {},
): SensitivityRow[] {
  if (!dataset.subfactors?.length) return [];
  const rows: SensitivityRow[] = [];
  for (const sf of dataset.subfactors) {
    let evLow = Infinity;
    let evHigh = -Infinity;
    let bestStateId = sf.states[0].id;
    let worstStateId = sf.states[0].id;
    for (const st of sf.states) {
      const pinned: SubCredences = {
        ...subCredences,
        [sf.id]: Object.fromEntries(sf.states.map((s) => [s.id, s.id === st.id ? 1 : 0])),
      };
      const ev = analyze(dataset, deriveCredences(dataset, credences, pinned), weights, evaluator, pins).ev;
      if (ev > evHigh) {
        evHigh = ev;
        bestStateId = st.id;
      }
      if (ev < evLow) {
        evLow = ev;
        worstStateId = st.id;
      }
    }
    rows.push({
      factorId: sf.id,
      label: sf.label,
      kind: sf.kind,
      evLow,
      evHigh,
      bestStateId,
      worstStateId,
      swing: evHigh - evLow,
    });
  }
  return rows.sort((a, b) => b.swing - a.swing);
}
