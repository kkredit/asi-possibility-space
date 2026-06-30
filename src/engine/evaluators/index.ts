import type { Evaluator } from '@model/types';
import { linearEvaluator } from './linear';
import { cachedEvaluator } from './cached';
import { fittedLinearEvaluator, fittedPairwiseEvaluator } from './fitted';
import { archetypeEvaluator } from './archetype';

export { linearEvaluator } from './linear';
export { cachedEvaluator, isReasoned } from './cached';
export { fittedLinearEvaluator, fittedPairwiseEvaluator } from './fitted';
export { archetypeEvaluator } from './archetype';

/**
 * The pluggable evaluator registry, ordered most- to least-faithful to the
 * hand-reasoned surface. Add new evaluators here; the Controls UI renders whatever
 * is in this array. The fitted models are least-squares fits to the cached cells —
 * see {@link file://./../fit.ts} and docs/MODEL.md for what their residuals mean.
 */
export const evaluators: Evaluator[] = [
  cachedEvaluator,
  fittedPairwiseEvaluator,
  archetypeEvaluator,
  fittedLinearEvaluator,
  linearEvaluator,
];

export function getEvaluator(id: string): Evaluator {
  return evaluators.find((e) => e.id === id) ?? linearEvaluator;
}
