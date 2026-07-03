import type { Dataset, Evaluator, Scenario, ValueVector } from '@model/types';
import { classifyCorner, CORNER_FACTORS } from '@model/corners';
import { isReasoned } from '@engine/evaluators/cached';
import { linearEvaluator } from '@engine/evaluators/linear';
import { VALUE_DIMENSION_IDS, zeroVector } from '@engine/value';

/**
 * A logical-gating model — a different *family* from the additive evaluators.
 *
 * The hand-reasoned narratives are organised around four archetypes set by hard
 * logical gates, not by a sum of factor contributions:
 *
 *   BENIGN   orthogonality fails        → capable systems are benign regardless of
 *                                          our alignment/control work.
 *   ALIGNED  holds ∧ alignment-in-time  → we fielded aligned ASI; broadly good.
 *   CONTROL  holds ∧ ¬aligned ∧ control → misaligned but leashed; survival rides
 *                                          on the leash holding.
 *   DOOM     holds ∧ ¬aligned ∧ ¬control→ an uncontained misaligned ASI takes over.
 *
 * Deception is a fifth gate: it decides whether a leash (CONTROL) or a verified
 * alignment (ALIGNED) can be trusted at all, so each archetype is split by
 * deceptive/faithful — **eight régimes**. This evaluator classifies each scenario
 * into its régime and predicts the **mean cached value of that régime** — a
 * piecewise-constant model, zero hand-tuning. Its residual against cached measures
 * how much of the surface is explained by these logical gates alone; compare it to
 * the fitted models on the ladder. See docs/MODEL.md.
 *
 * Unlike the additive evaluators this one is domain-specific: it reads particular
 * factor/state ids. Deception is optional (it splits the régimes only when present);
 * if the core gate factors are absent it degrades to linear.
 */

/** The régime key: corner (shared classifier from @model/corners), split by
 *  deception when present (8 vs 4 régimes), and — in régimes where a misaligned
 *  takeover actually happens — by takeover severity (up to 12 régimes). This
 *  mirrors the value surface's own gating (expandDeception / expandSeverity). */
function regime(scenario: Scenario): string | undefined {
  const c = classifyCorner(scenario);
  if (!c) return undefined;
  const dec = scenario['deception'];
  let key = dec !== undefined ? `${c}|${dec}` : c;
  const takeover = c === 'doom' || (dec === 'deceptive' && c !== 'benign');
  const sev = scenario['takeoverSeverity'];
  if (takeover && sev !== undefined) key += `|${sev}`;
  return key;
}

function hasArchetypeFactors(dataset: Dataset): boolean {
  const ids = new Set(dataset.factors.map((f) => f.id));
  return CORNER_FACTORS.every((f) => ids.has(f));
}

/** Mean cached value vector per régime, computed from the reasoned cells. */
function buildMeans(dataset: Dataset): Record<string, ValueVector> {
  const sum: Record<string, ValueVector> = {};
  const count: Record<string, number> = {};
  for (const cell of dataset.cachedOutcomes) {
    if (!isReasoned(cell.scenario, dataset)) continue;
    const key = regime(cell.scenario);
    if (!key) continue;
    if (!sum[key]) {
      sum[key] = zeroVector();
      count[key] = 0;
    }
    count[key]++;
    for (const d of VALUE_DIMENSION_IDS) sum[key][d] += cell.outcome.value[d];
  }
  const means: Record<string, ValueVector> = {};
  for (const key of Object.keys(sum)) {
    means[key] = zeroVector();
    for (const d of VALUE_DIMENSION_IDS) means[key][d] = sum[key][d] / count[key];
  }
  return means;
}

const cache = new WeakMap<Dataset, Record<string, ValueVector>>();
function meansFor(dataset: Dataset): Record<string, ValueVector> {
  let m = cache.get(dataset);
  if (!m) cache.set(dataset, (m = buildMeans(dataset)));
  return m;
}

export const archetypeEvaluator: Evaluator = {
  id: 'archetype',
  label: 'Logical gates',
  description:
    'Piecewise model: classify each scenario into a logical régime (benign / aligned / control / doom, split by deception, and takeover régimes split by severity) and predict that régime’s mean value. Zero hand-tuning — tests whether the surface is gated rather than additive.',
  evaluate(scenario: Scenario, dataset: Dataset) {
    if (!hasArchetypeFactors(dataset)) return linearEvaluator.evaluate(scenario, dataset);
    const key = regime(scenario);
    const means = meansFor(dataset);
    if (!key || !means[key]) return linearEvaluator.evaluate(scenario, dataset);
    return { narrative: '', value: { ...means[key] } };
  },
};
