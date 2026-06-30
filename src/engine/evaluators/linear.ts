import type { Dataset, Evaluator, Scenario } from '@model/types';
import { addVectors, clampVector } from '@engine/value';

/**
 * Additive linear model: each factor-state contributes a fixed vector, summed
 * onto the baseline and clamped. No interactions between factors — intentionally
 * crude, so its divergence from the cached evaluator measures non-linearity.
 */
export const linearEvaluator: Evaluator = {
  id: 'linear',
  label: 'Linear',
  description:
    'Each factor contributes a fixed value independently; contributions are summed. Tests whether the space is approximately linear.',
  evaluate(scenario: Scenario, dataset: Dataset) {
    let value = { ...dataset.linearBaseline };
    for (const fid of Object.keys(scenario)) {
      const contribution = dataset.linearContributions[fid]?.[scenario[fid]];
      if (contribution) value = addVectors(value, contribution);
    }
    return { narrative: '', value: clampVector(value) };
  },
};
