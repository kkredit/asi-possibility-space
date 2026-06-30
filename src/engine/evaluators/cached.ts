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
 * Restrict a scenario to a subset of factors. The cached cells are authored over
 * fewer factors than the full space enumerates (e.g. they don't vary takeoff
 * speed), so lookups project onto the authored factors — every takeoff variant of
 * an authored cell shares that cell's outcome. Takeoff still shapes the cached
 * surface, but through its *couplings* (e.g. fast → concentrated) rather than a
 * per-takeoff hand-reasoned value. Authoring takeoff into the cells later just
 * works: the projection widens to include it automatically.
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
