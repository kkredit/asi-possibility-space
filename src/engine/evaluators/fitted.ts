import type { Dataset, Evaluator, Scenario } from '@model/types';
import { clampVector } from '@engine/value';
import { fittedModel } from '@engine/fit';

/**
 * Best-fit additive model: same sum-of-parts form as the hand-set `linear`
 * evaluator, but every coefficient is solved by least squares against the
 * hand-reasoned cells. It is the best an interaction-free model can do, so its
 * gap to the cached evaluator is the surface's *irreducible* non-linearity — the
 * part no sum-of-independent-factors can represent. (Compare with `linear`: the
 * extra gap there is just suboptimal hand-chosen coefficients.)
 */
export const fittedLinearEvaluator: Evaluator = {
  id: 'fitted',
  label: 'Fitted linear',
  description:
    'Additive model with coefficients fit by least squares to the hand-reasoned cells. Its residual against cached is the irreducible non-linearity — what no sum-of-factors can capture.',
  evaluate(scenario: Scenario, dataset: Dataset) {
    return { narrative: '', value: clampVector(fittedModel(dataset, false).predict(scenario)) };
  },
};

/**
 * Fitted model with two-way interaction terms: main effects plus an indicator for
 * every pair of factor-states. It can represent any two-way interaction, so its
 * residual against cached isolates the *higher-than-pairwise* structure. The drop
 * from `fitted` to `fitted-pairwise` is how much of the non-linearity is explained
 * by simple pairwise interactions vs. genuinely three-way-and-up entanglement.
 */
export const fittedPairwiseEvaluator: Evaluator = {
  id: 'fittedPairwise',
  label: 'Fitted + pairwise',
  description:
    'Fitted additive model plus all two-way interaction terms. Its residual against cached isolates structure beyond pairwise — genuinely three-way-and-up entanglement.',
  evaluate(scenario: Scenario, dataset: Dataset) {
    return { narrative: '', value: clampVector(fittedModel(dataset, true).predict(scenario)) };
  },
};
