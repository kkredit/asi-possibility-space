import type { Credences, Factor, FactorId, Scenario, StateId } from '@model/types';

/** Stable, order-independent key for a scenario (factors sorted by id). */
export function scenarioKey(scenario: Scenario): string {
  return Object.keys(scenario)
    .sort()
    .map((fid) => `${fid}:${scenario[fid]}`)
    .join('|');
}

/** A pin freezes a factor to one state (removing it as a free dimension). */
export type Pins = Partial<Record<FactorId, StateId>>;

/**
 * Enumerate the full cross-product of factor states. Pinned factors contribute
 * only their pinned state, collapsing that dimension.
 */
export function enumerateScenarios(factors: Factor[], pins: Pins = {}): Scenario[] {
  let scenarios: Scenario[] = [{}];
  for (const factor of factors) {
    const states = pins[factor.id] ? [pins[factor.id] as StateId] : factor.states.map((s) => s.id);
    const next: Scenario[] = [];
    for (const partial of scenarios) {
      for (const stateId of states) {
        next.push({ ...partial, [factor.id]: stateId });
      }
    }
    scenarios = next;
  }
  return scenarios;
}

/**
 * Probability of a scenario under the independence assumption: the product of
 * each factor's credence for its assigned state.
 */
export function scenarioProbability(scenario: Scenario, credences: Credences): number {
  let p = 1;
  for (const fid of Object.keys(scenario)) {
    p *= credences[fid]?.[scenario[fid]] ?? 0;
  }
  return p;
}
