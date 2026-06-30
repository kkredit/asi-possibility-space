import type { Dataset, Evaluator, FactorId, Outcome, Scenario } from '@model/types';
import { scenarioKey } from '@engine/scenarios';
import { linearEvaluator } from './linear';

interface CachedIndex {
  outcomes: Map<string, Outcome>;
  /** The factors the authored cells actually range over. */
  factorIds: FactorId[];
}

function buildIndex(dataset: Dataset): CachedIndex {
  const factorIds = [
    ...new Set(dataset.cachedOutcomes.flatMap((c) => Object.keys(c.scenario))),
  ];
  const outcomes = new Map<string, Outcome>();
  for (const cell of dataset.cachedOutcomes) {
    outcomes.set(scenarioKey(project(cell.scenario, factorIds)), cell.outcome);
  }
  return { outcomes, factorIds };
}

/**
 * Restrict a scenario to the factors the authored cells actually range over. The
 * cells may cover fewer factors than the full space enumerates; lookups project
 * onto the authored subset so each cell still matches. (Today the cells cover all
 * factors including takeoff, so this is the identity — but if cells are authored
 * over a subset later, every un-authored variant gracefully shares the base cell.)
 */
function project(scenario: Scenario, factorIds: FactorId[]): Scenario {
  const out: Scenario = {};
  for (const fid of factorIds) out[fid] = scenario[fid];
  return out;
}

let cache: { dataset: Dataset; index: CachedIndex } | undefined;

function indexFor(dataset: Dataset): CachedIndex {
  if (cache?.dataset !== dataset) cache = { dataset, index: buildIndex(dataset) };
  return cache.index;
}

function lookup(scenario: Scenario, dataset: Dataset): Outcome | undefined {
  const index = indexFor(dataset);
  return index.outcomes.get(scenarioKey(project(scenario, index.factorIds)));
}

/** True when a scenario has an authored cell (vs. linear fallback). */
export function isReasoned(scenario: Scenario, dataset: Dataset): boolean {
  return lookup(scenario, dataset) !== undefined;
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
    return lookup(scenario, dataset) ?? linearEvaluator.evaluate(scenario, dataset);
  },
};
