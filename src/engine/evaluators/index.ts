import type { Evaluator } from '@model/types';
import { linearEvaluator } from './linear';
import { cachedEvaluator } from './cached';

export { linearEvaluator } from './linear';
export { cachedEvaluator, isReasoned } from './cached';

/** The pluggable evaluator registry. Add new evaluators here. */
export const evaluators: Evaluator[] = [cachedEvaluator, linearEvaluator];

export function getEvaluator(id: string): Evaluator {
  return evaluators.find((e) => e.id === id) ?? linearEvaluator;
}
