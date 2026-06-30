import type { Evaluator } from '@model/types';
import { cachedEvaluator } from './cached';
import { fittedLinearEvaluator, fittedPairwiseEvaluator } from './fitted';
import { archetypeEvaluator } from './archetype';

export { linearEvaluator } from './linear';
export { cachedEvaluator, isReasoned } from './cached';
export { fittedLinearEvaluator, fittedPairwiseEvaluator } from './fitted';
export { archetypeEvaluator } from './archetype';

/**
 * The pluggable, user-selectable evaluator registry, ordered most- to least-faithful
 * to the hand-reasoned surface. Add new evaluators here; the Controls UI renders
 * whatever is in this array. The fitted models are least-squares fits to the cached
 * cells — see {@link file://./../fit.ts} and docs/MODEL.md for what their residuals
 * mean. (The hand-set `linearEvaluator` is intentionally NOT listed: it's a crude
 * baseline kept only as the internal fallback for un-authored cells — see below.)
 */
export const evaluators: Evaluator[] = [
  cachedEvaluator,
  fittedPairwiseEvaluator,
  archetypeEvaluator,
  fittedLinearEvaluator,
];

export function getEvaluator(id: string): Evaluator {
  return evaluators.find((e) => e.id === id) ?? cachedEvaluator;
}
