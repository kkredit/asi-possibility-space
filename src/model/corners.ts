import type { Scenario } from './types';

/**
 * The four narrative archetypes ("corners") the hand-reasoned surface is organised
 * around, gated by three factors:
 *
 *   BENIGN   orthogonality fails                         → capable systems are benign anyway
 *   ALIGNED  holds ∧ alignment-in-time = yes             → we fielded aligned ASI
 *   CONTROL  holds ∧ ¬aligned ∧ control deployed         → misaligned but leashed
 *   DOOM     holds ∧ ¬aligned ∧ ¬control                 → uncontained misaligned ASI
 *
 * This is the one shared classifier behind the cached-cell expansion (dataset.ts),
 * the archetype evaluator, and the doc-mining scripts.
 */
export const CORNERS = ['doom', 'control', 'aligned', 'benign'] as const;
export type Corner = (typeof CORNERS)[number];

/** The gate factors the corner classification reads. */
export const CORNER_FACTORS = ['orthogonality', 'alignmentInTime', 'controlDeployed'] as const;

/** Classify a scenario into its corner; undefined when a gate factor is absent. */
export function classifyCorner(scenario: Scenario): Corner | undefined {
  const orth = scenario.orthogonality;
  const align = scenario.alignmentInTime;
  const ctrl = scenario.controlDeployed;
  if (orth === undefined || align === undefined || ctrl === undefined) return undefined;
  if (orth === 'fails') return 'benign';
  if (align === 'yes') return 'aligned';
  if (ctrl === 'yes') return 'control';
  return 'doom';
}
