import type { Dataset, Evaluator, Outcome, Scenario } from '@model/types';
import { scenarioKey } from '@engine/scenarios';
import { linearEvaluator } from './linear';

function buildIndex(dataset: Dataset): Map<string, Outcome> {
  const index = new Map<string, Outcome>();
  for (const cell of dataset.cachedOutcomes) {
    index.set(scenarioKey(cell.scenario), cell.outcome);
  }
  return index;
}

let cache: { dataset: Dataset; index: Map<string, Outcome> } | undefined;

function indexFor(dataset: Dataset): Map<string, Outcome> {
  if (cache?.dataset !== dataset) cache = { dataset, index: buildIndex(dataset) };
  return cache.index;
}

/** True when a scenario has an authored cell (vs. linear fallback). */
export function isReasoned(scenario: Scenario, dataset: Dataset): boolean {
  return indexFor(dataset).has(scenarioKey(scenario));
}

/**
 * Hand-reasoned lookup. For un-authored cells it falls back to the linear
 * evaluator's value (with an empty narrative) so the surface is always defined.
 */
export const cachedEvaluator: Evaluator = {
  id: 'cached',
  label: 'Cached (hand-reasoned)',
  description:
    'Authored outcomes reasoned one scenario at a time. Un-authored cells fall back to the linear evaluator and are flagged.',
  evaluate(scenario: Scenario, dataset: Dataset) {
    const hit = indexFor(dataset).get(scenarioKey(scenario));
    if (hit) return hit;
    return linearEvaluator.evaluate(scenario, dataset);
  },
};
