import type { Coupling, Credences, Factor, FactorId, Scenario, StateId } from '@model/types';

/** Stable, order-independent key for a scenario (factors sorted by id).
 *  Memoized per scenario object — enumerations are shared (see below), so in the
 *  hot paths this is a WeakMap hit instead of a sort+join. */
const keyCache = new WeakMap<Scenario, string>();
export function scenarioKey(scenario: Scenario): string {
  let k = keyCache.get(scenario);
  if (k === undefined) {
    k = Object.keys(scenario)
      .sort()
      .map((fid) => `${fid}:${scenario[fid]}`)
      .join('|');
    keyCache.set(scenario, k);
  }
  return k;
}

/** A pin freezes a factor to one state (removing it as a free dimension). */
export type Pins = Partial<Record<FactorId, StateId>>;

/**
 * Enumerate the full cross-product of factor states. Pinned factors contribute
 * only their pinned state, collapsing that dimension.
 *
 * Memoized per (factors, pins): the tornado, threshold sweeps and the
 * action-conditions grid re-enumerate the same (sub)spaces hundreds of times per
 * interaction, and sharing the scenario OBJECTS is what makes the per-scenario
 * caches (scenarioKey, the cached evaluator's outcome memo) effective.
 * Treat the returned array and its scenarios as READ-ONLY.
 */
const enumCache = new WeakMap<Factor[], Map<string, Scenario[]>>();

export function enumerateScenarios(factors: Factor[], pins: Pins = {}): Scenario[] {
  const pinsKey = Object.keys(pins)
    .sort()
    .map((f) => `${f}:${pins[f]}`)
    .join('|');
  let byPins = enumCache.get(factors);
  if (!byPins) enumCache.set(factors, (byPins = new Map()));
  const hit = byPins.get(pinsKey);
  if (hit) return hit;

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
  byPins.set(pinsKey, scenarios);
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

/**
 * The product of every coupling multiplier whose `when` conditions all hold in
 * this scenario. 1 when no coupling applies (pure independence). This is the
 * log-linear correction that `analyze` multiplies onto the independent prior
 * before renormalizing — see {@link Coupling}.
 */
export function couplingMultiplier(scenario: Scenario, couplings: Coupling[]): number {
  let m = 1;
  for (const c of couplings) {
    if (c.when.every(({ factor, state }) => scenario[factor] === state)) m *= c.multiplier;
  }
  return m;
}
