import type {
  Credences,
  Dataset,
  Evaluator,
  FactorId,
  FactorKind,
  Scenario,
  StateId,
} from '@model/types';
import { analyze } from '@engine/analyze';
import { scenarioKey, type Pins } from '@engine/scenarios';

/**
 * Conditional contrast — "under what conditions is choice X favorable?"
 *
 * A decision picks a factor and two of its states: a `toward` state A (the choice)
 * and a `baseline` state B (the alternative). Favorability is the *contrastive*
 * quantity V(…, A) − V(…, B). Everything here reuses `analyze` + pinning:
 *
 *  - netDelta      = EV with the factor pinned to A − EV pinned to B, at the user's
 *                    beliefs (within any `given` conditions). The headline verdict.
 *  - favorableShare= probability-weighted share of "the rest of the world" for which
 *                    A beats B pointwise. "Favorable in 38% of likely futures."
 *  - cruxes        = for every OTHER factor, the contrast's EV delta conditioned on
 *                    each of that factor's states. A factor whose states flip the
 *                    sign is what decides whether the choice is good — the literal
 *                    "under what conditions" answer.
 *
 * The decision factor can be ANY factor (objective/contingent/influenceable alike) —
 * the query treats it as a hypothetical lever ("if this were so / if we steered
 * here"), independent of whether an action could really move it.
 */

export interface Decision {
  factor: FactorId;
  /** State A — the choice being evaluated. */
  toward: StateId;
  /** State B — the alternative it's compared against. */
  baseline: StateId;
}

export interface CruxStateDelta {
  stateId: StateId;
  label: string;
  delta: number;
}

export interface Crux {
  factorId: FactorId;
  label: string;
  kind: FactorKind;
  states: CruxStateDelta[];
  /** Most-unfavorable and most-favorable conditional deltas across this factor. */
  low: number;
  high: number;
  lowStateLabel: string;
  highStateLabel: string;
  /** True when the sign flips across this factor's states (a verdict-flipper). */
  flips: boolean;
  /** high − low: how much this factor moves the verdict. */
  span: number;
}

export interface ConditionLine {
  factorId: FactorId;
  label: string;
  stateId: StateId;
  stateLabel: string;
  delta: number;
}

export interface ConditionalContrast {
  evA: number;
  evB: number;
  netDelta: number;
  favorableShare: number;
  cruxes: Crux[];
  favorableWhen: ConditionLine[];
  unfavorableWhen: ConditionLine[];
}

/**
 * One "rest-of-world" configuration (every factor except the decision factor), with
 * its probability mass and the scalar value the world takes under the toward state
 * (a) and the baseline state (b). The contrast is computed *interventionally*:
 * a and b come from the SAME rest configuration, so the comparison is apples-to-
 * apples and never smuggles in a coupling-driven shift in the other factors' beliefs.
 */
interface RestGroup {
  rest: Record<FactorId, StateId>;
  prob: number;
  a: number;
  b: number;
}

/**
 * Enumerate the (given-conditioned) space once with the decision factor left free,
 * then collapse to rest-of-world groups carrying the value under A and under B.
 */
function groupByRest(
  dataset: Dataset,
  credences: Credences,
  weights: Parameters<typeof analyze>[2],
  evaluator: Evaluator,
  decision: Decision,
  given: Pins,
  jointProbability?: (s: Scenario) => number,
): RestGroup[] {
  const scenarios = analyze(dataset, credences, weights, evaluator, given, jointProbability).scenarios;
  const map = new Map<string, { rest: Record<FactorId, StateId>; prob: number; a?: number; b?: number }>();
  for (const s of scenarios) {
    const rest = { ...s.scenario };
    delete rest[decision.factor];
    const key = scenarioKey(rest);
    let g = map.get(key);
    if (!g) map.set(key, (g = { rest, prob: 0 }));
    g.prob += s.probability;
    if (s.scenario[decision.factor] === decision.toward) g.a = s.scalar;
    if (s.scenario[decision.factor] === decision.baseline) g.b = s.scalar;
  }
  const out: RestGroup[] = [];
  for (const g of map.values()) {
    if (g.a !== undefined && g.b !== undefined) out.push({ rest: g.rest, prob: g.prob, a: g.a, b: g.b });
  }
  return out;
}

/** Probability-weighted contrast stats over a set of rest-groups. */
function summarize(groups: RestGroup[]) {
  let p = 0;
  let evA = 0;
  let evB = 0;
  let fav = 0;
  for (const g of groups) {
    p += g.prob;
    evA += g.prob * g.a;
    evB += g.prob * g.b;
    if (g.a > g.b) fav += g.prob;
  }
  if (p <= 0) return { delta: 0, favorableShare: 0, evA: 0, evB: 0, mass: 0 };
  return { delta: (evA - evB) / p, favorableShare: fav / p, evA: evA / p, evB: evB / p, mass: p };
}

export function conditionalContrast(
  dataset: Dataset,
  credences: Credences,
  weights: Parameters<typeof analyze>[2],
  evaluator: Evaluator,
  decision: Decision,
  given: Pins = {},
  jointProbability?: (s: Scenario) => number,
): ConditionalContrast {
  // The decision factor is the free variable, so any `given` pin on it is dropped.
  const base: Pins = { ...given };
  delete base[decision.factor];

  const groups = groupByRest(dataset, credences, weights, evaluator, decision, base, jointProbability);
  const overall = summarize(groups);

  // Cruxes: every other free factor, with the contrast's mean delta conditioned on
  // each of that factor's states (the subgroup of rest-worlds where it holds).
  const cruxes: Crux[] = [];
  const favorableWhen: ConditionLine[] = [];
  const unfavorableWhen: ConditionLine[] = [];

  for (const factor of dataset.factors) {
    if (factor.id === decision.factor || base[factor.id] !== undefined) continue;
    const states: CruxStateDelta[] = factor.states.map((st) => {
      const delta = summarize(groups.filter((g) => g.rest[factor.id] === st.id)).delta;
      return { stateId: st.id, label: st.label, delta };
    });
    let low = states[0];
    let high = states[0];
    for (const s of states) {
      if (s.delta < low.delta) low = s;
      if (s.delta > high.delta) high = s;
      const line: ConditionLine = {
        factorId: factor.id,
        label: factor.label,
        stateId: s.stateId,
        stateLabel: s.label,
        delta: s.delta,
      };
      if (s.delta > 0) favorableWhen.push(line);
      else if (s.delta < 0) unfavorableWhen.push(line);
    }
    cruxes.push({
      factorId: factor.id,
      label: factor.label,
      kind: factor.kind,
      states,
      low: low.delta,
      high: high.delta,
      lowStateLabel: low.label,
      highStateLabel: high.label,
      flips: low.delta < 0 && high.delta > 0,
      span: high.delta - low.delta,
    });
  }

  cruxes.sort((a, b) => Math.max(Math.abs(b.low), Math.abs(b.high)) - Math.max(Math.abs(a.low), Math.abs(a.high)));
  favorableWhen.sort((a, b) => b.delta - a.delta);
  unfavorableWhen.sort((a, b) => a.delta - b.delta);

  return {
    evA: overall.evA,
    evB: overall.evB,
    netDelta: overall.delta,
    favorableShare: overall.favorableShare,
    cruxes,
    favorableWhen,
    unfavorableWhen,
  };
}

// ---------------------------------------------------------------------------
// Belief threshold — "how sure would you need to be?"
// ---------------------------------------------------------------------------

/** Just the net delta of a contrast (no cruxes/lists), for fast sweeps. */
function netDeltaFor(
  dataset: Dataset,
  credences: Credences,
  weights: Parameters<typeof analyze>[2],
  evaluator: Evaluator,
  decision: Decision,
  given: Pins,
): number {
  const base: Pins = { ...given };
  delete base[decision.factor];
  return summarize(groupByRest(dataset, credences, weights, evaluator, decision, base)).delta;
}

/** Set one state's probability to `value`, redistributing the rest proportionally. */
function withMarginal(
  dist: Record<StateId, number>,
  state: StateId,
  value: number,
): Record<StateId, number> {
  const v = Math.max(0, Math.min(1, value));
  const others = Object.keys(dist).filter((s) => s !== state);
  const priorOthers = others.reduce((a, s) => a + dist[s], 0);
  const remaining = 1 - v;
  const out: Record<StateId, number> = { [state]: v };
  for (const s of others) out[s] = priorOthers > 0 ? remaining * (dist[s] / priorOthers) : remaining / others.length;
  return out;
}

export interface ThresholdPoint {
  p: number;
  netDelta: number;
}

export interface ThresholdCrossing {
  /** Credence in the swept state at which the verdict flips. */
  p: number;
  /** True if the choice becomes favorable as the credence rises through `p`. */
  favorableAbove: boolean;
}

export interface BeliefThreshold {
  sweepFactor: FactorId;
  sweepState: StateId;
  /** The current credence in the swept state. */
  currentP: number;
  netDeltaAtCurrent: number;
  /** Sweep of net delta as P(sweepState) goes 0 → 1 (others redistributed). */
  points: ThresholdPoint[];
  /** Break-even credences where the verdict flips sign. */
  crossings: ThresholdCrossing[];
}

/**
 * Sweep the credence in one factor-state from 0 to 1 (redistributing that factor's
 * other states) and trace the contrast's net delta, locating the break-even
 * credence(s) where the verdict flips — "favorable as long as P(X) exceeds Y%".
 *
 * This sweeps a *marginal credence*, so it uses the independence×couplings model
 * (no joint override): it answers "how does the verdict depend on my credence in X?".
 * Choosing the decision factor itself as the sweep target is meaningless (it's
 * integrated out of the contrast) — pick another factor.
 */
export function beliefThreshold(
  dataset: Dataset,
  credences: Credences,
  weights: Parameters<typeof analyze>[2],
  evaluator: Evaluator,
  decision: Decision,
  sweepFactor: FactorId,
  sweepState: StateId,
  given: Pins = {},
  steps = 51,
): BeliefThreshold {
  const dist = credences[sweepFactor] ?? {};
  const currentP = dist[sweepState] ?? 0;

  const points: ThresholdPoint[] = [];
  for (let i = 0; i < steps; i++) {
    const p = i / (steps - 1);
    const swept: Credences = { ...credences, [sweepFactor]: withMarginal(dist, sweepState, p) };
    points.push({ p, netDelta: netDeltaFor(dataset, swept, weights, evaluator, decision, given) });
  }

  const crossings: ThresholdCrossing[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if ((a.netDelta < 0 && b.netDelta >= 0) || (a.netDelta > 0 && b.netDelta <= 0)) {
      // Linear-interpolate the zero crossing between the two samples.
      const t = a.netDelta / (a.netDelta - b.netDelta);
      crossings.push({ p: a.p + t * (b.p - a.p), favorableAbove: b.netDelta >= a.netDelta });
    }
  }

  return {
    sweepFactor,
    sweepState,
    currentP,
    netDeltaAtCurrent: netDeltaFor(dataset, credences, weights, evaluator, decision, given),
    points,
    crossings,
  };
}

export interface ContrastGrid {
  f1: FactorId;
  f2: FactorId;
  rows: { stateId: StateId; label: string }[];
  cols: { stateId: StateId; label: string }[];
  /** cells[i][j] = contrast delta with f1=rows[i], f2=cols[j]. */
  cells: number[][];
  maxAbs: number;
}

/** Two-way map of the contrast's delta over the states of two conditioning factors. */
export function contrastGrid(
  dataset: Dataset,
  credences: Credences,
  weights: Parameters<typeof analyze>[2],
  evaluator: Evaluator,
  decision: Decision,
  f1Id: FactorId,
  f2Id: FactorId,
  given: Pins = {},
  jointProbability?: (s: Scenario) => number,
): ContrastGrid | null {
  const f1 = dataset.factors.find((f) => f.id === f1Id);
  const f2 = dataset.factors.find((f) => f.id === f2Id);
  if (!f1 || !f2 || f1.id === f2.id) return null;

  const base: Pins = { ...given };
  delete base[decision.factor];

  const groups = groupByRest(dataset, credences, weights, evaluator, decision, base, jointProbability);
  const cells: number[][] = [];
  let maxAbs = 0;
  for (const s1 of f1.states) {
    const row: number[] = [];
    for (const s2 of f2.states) {
      const delta = summarize(
        groups.filter((g) => g.rest[f1.id] === s1.id && g.rest[f2.id] === s2.id),
      ).delta;
      maxAbs = Math.max(maxAbs, Math.abs(delta));
      row.push(delta);
    }
    cells.push(row);
  }
  return {
    f1: f1.id,
    f2: f2.id,
    rows: f1.states.map((s) => ({ stateId: s.id, label: s.label })),
    cols: f2.states.map((s) => ({ stateId: s.id, label: s.label })),
    cells,
    maxAbs,
  };
}
