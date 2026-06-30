import type { Dataset, Evaluator, Scenario, ValueVector } from '@model/types';
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
 * This evaluator classifies each scenario into its archetype and predicts the
 * **mean cached value of that archetype** — a piecewise-constant model with just
 * four cells (16 numbers, all derived from the data, none hand-tuned). Its residual
 * against cached answers a sharp question: how much of the surface is explained by
 * four logical buckets alone? Compare it to the fitted models on the ladder — if a
 * 4-group gate rivals the 141-parameter pairwise fit, the surface is fundamentally
 * *logical* (gated), not *additive*. See docs/MODEL.md.
 *
 * Unlike the additive evaluators this one is domain-specific: it reads particular
 * factor/state ids. If those factors aren't in the dataset it degrades to linear.
 */

const ARCHETYPE_FACTORS = ['orthogonality', 'alignmentInTime', 'controlDeployed'] as const;

type Archetype = 'benign' | 'aligned' | 'control' | 'doom';

function classify(scenario: Scenario): Archetype | undefined {
  const orth = scenario['orthogonality'];
  const align = scenario['alignmentInTime'];
  const ctrl = scenario['controlDeployed'];
  if (orth === undefined || align === undefined || ctrl === undefined) return undefined;
  if (orth === 'fails') return 'benign';
  if (align === 'yes') return 'aligned';
  if (ctrl === 'yes') return 'control';
  return 'doom';
}

function hasArchetypeFactors(dataset: Dataset): boolean {
  const ids = new Set(dataset.factors.map((f) => f.id));
  return ARCHETYPE_FACTORS.every((f) => ids.has(f));
}

/** Mean cached value vector per archetype, computed from the reasoned cells. */
function buildMeans(dataset: Dataset): Record<Archetype, ValueVector> {
  const sum: Record<string, ValueVector> = {};
  const count: Record<string, number> = {};
  for (const cell of dataset.cachedOutcomes) {
    if (!isReasoned(cell.scenario, dataset)) continue;
    const a = classify(cell.scenario);
    if (!a) continue;
    if (!sum[a]) {
      sum[a] = zeroVector();
      count[a] = 0;
    }
    count[a]++;
    for (const d of VALUE_DIMENSION_IDS) sum[a][d] += cell.outcome.value[d];
  }
  const means = {} as Record<Archetype, ValueVector>;
  for (const a of Object.keys(sum) as Archetype[]) {
    means[a] = zeroVector();
    for (const d of VALUE_DIMENSION_IDS) means[a][d] = sum[a][d] / count[a];
  }
  return means;
}

const cache = new WeakMap<Dataset, Record<Archetype, ValueVector>>();
function meansFor(dataset: Dataset): Record<Archetype, ValueVector> {
  let m = cache.get(dataset);
  if (!m) cache.set(dataset, (m = buildMeans(dataset)));
  return m;
}

export const archetypeEvaluator: Evaluator = {
  id: 'archetype',
  label: 'Logical gates',
  description:
    'Piecewise model: classify each scenario into one of four logical archetypes (benign / aligned / control / doom) and predict that archetype’s mean value. Four buckets, zero hand-tuning — tests whether the surface is gated rather than additive.',
  evaluate(scenario: Scenario, dataset: Dataset) {
    if (!hasArchetypeFactors(dataset)) return linearEvaluator.evaluate(scenario, dataset);
    const a = classify(scenario);
    const means = meansFor(dataset);
    if (!a || !means[a]) return linearEvaluator.evaluate(scenario, dataset);
    return { narrative: '', value: { ...means[a] } };
  },
};
