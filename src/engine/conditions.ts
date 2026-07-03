import type {
  Action,
  Credences,
  Dataset,
  Evaluator,
  Factor,
  FactorId,
  FactorKind,
  Scenario,
  StateId,
  ValueVector,
} from '@model/types';
import { analyze } from '@engine/analyze';
import { applyAction, withMarginal } from '@engine/actions';
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
  weights: ValueVector,
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

/**
 * Fold per-factor state deltas into the crux tornado + the favorable/unfavorable
 * condition lists — the shared read-out shape behind both the factor-contrast and
 * the action-conditions views. Sorting: cruxes by largest absolute conditional
 * delta, condition lines by magnitude.
 */
function cruxTornado(
  entries: { factor: Factor; states: CruxStateDelta[] }[],
): Pick<ConditionalContrast, 'cruxes' | 'favorableWhen' | 'unfavorableWhen'> {
  const cruxes: Crux[] = [];
  const favorableWhen: ConditionLine[] = [];
  const unfavorableWhen: ConditionLine[] = [];

  for (const { factor, states } of entries) {
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
  return { cruxes, favorableWhen, unfavorableWhen };
}

/** Assemble a two-way state grid from a per-(state, state) delta function. */
function buildGrid(f1: Factor, f2: Factor, delta: (s1: StateId, s2: StateId) => number): ContrastGrid {
  const cells: number[][] = [];
  let maxAbs = 0;
  for (const s1 of f1.states) {
    const row: number[] = [];
    for (const s2 of f2.states) {
      const d = delta(s1.id, s2.id);
      maxAbs = Math.max(maxAbs, Math.abs(d));
      row.push(d);
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

/** Zero crossings of a netDelta trace, linearly interpolated between samples. */
function findCrossings(points: ThresholdPoint[]): ThresholdCrossing[] {
  const crossings: ThresholdCrossing[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if ((a.netDelta < 0 && b.netDelta >= 0) || (a.netDelta > 0 && b.netDelta <= 0)) {
      const t = a.netDelta / (a.netDelta - b.netDelta);
      crossings.push({ p: a.p + t * (b.p - a.p), favorableAbove: b.netDelta >= a.netDelta });
    }
  }
  return crossings;
}

export function conditionalContrast(
  dataset: Dataset,
  credences: Credences,
  weights: ValueVector,
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
  const entries = dataset.factors
    .filter((factor) => factor.id !== decision.factor && base[factor.id] === undefined)
    .map((factor) => ({
      factor,
      states: factor.states.map((st) => ({
        stateId: st.id,
        label: st.label,
        delta: summarize(groups.filter((g) => g.rest[factor.id] === st.id)).delta,
      })),
    }));

  return {
    evA: overall.evA,
    evB: overall.evB,
    netDelta: overall.delta,
    favorableShare: overall.favorableShare,
    ...cruxTornado(entries),
  };
}

// ---------------------------------------------------------------------------
// Belief threshold — "how sure would you need to be?"
// ---------------------------------------------------------------------------

/** Just the net delta of a contrast (no cruxes/lists), for fast sweeps. */
function netDeltaFor(
  dataset: Dataset,
  credences: Credences,
  weights: ValueVector,
  evaluator: Evaluator,
  decision: Decision,
  given: Pins,
): number {
  const base: Pins = { ...given };
  delete base[decision.factor];
  return summarize(groupByRest(dataset, credences, weights, evaluator, decision, base)).delta;
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
  weights: ValueVector,
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

  return {
    sweepFactor,
    sweepState,
    currentP,
    netDeltaAtCurrent: netDeltaFor(dataset, credences, weights, evaluator, decision, given),
    points,
    crossings: findCrossings(points),
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
  weights: ValueVector,
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
  return buildGrid(f1, f2, (s1, s2) =>
    summarize(groups.filter((g) => g.rest[f1.id] === s1 && g.rest[f2.id] === s2)).delta,
  );
}

// ===========================================================================
// ACTION CONDITIONS — "under what conditions should I PURSUE this action?"
// ---------------------------------------------------------------------------
// The inverse of the sensitivity tornado. Where `conditionalContrast` evaluates a
// hypothetical FACTOR-STATE flip, this evaluates one of the dataset's ACTIONS (a
// credence-shift intervention) and asks where it is the *best lever to pursue*.
//
// Conditions = the OBJECTIVE factors (the exogenous facts no action can move), so
// every action has room to act on the remaining factors, apples-to-apples. In each
// objective-world we compute the action's conditional-mean EV gain and compare it to
// the best alternative action (floored at doing nothing, gain 0): the *margin*. A
// positive margin means "this is the action to pursue here."
//
// Because actions move marginal credences, this uses the independence×couplings model
// (no joint override) — same rationale as `beliefThreshold`.
// ===========================================================================

/** Conditional-mean scalar EV over the free factors given `pins` (independence×couplings). */
function condMeanEV(
  dataset: Dataset,
  credences: Credences,
  weights: ValueVector,
  evaluator: Evaluator,
  pins: Pins,
): number {
  const a = analyze(dataset, credences, weights, evaluator, pins);
  return a.totalProbability > 0 ? a.ev / a.totalProbability : 0;
}

interface ActionWorld {
  pins: Pins;
  prob: number;
  /** gain(action) − best alternative action (floored at 0 = do nothing). */
  margin: number;
  /** raw EV gain of the action itself. */
  gain: number;
}

/** The objective factors we condition on (minus any already pinned in `given`). */
function conditionFactorIds(dataset: Dataset, given: Pins): FactorId[] {
  return dataset.factors.filter((f) => f.kind === 'objective' && given[f.id] === undefined).map((f) => f.id);
}

/**
 * Partition the (given-conditioned) space by objective-world and, in each, compute the
 * action's margin over the best alternative. The shared primitive behind every
 * action-conditions read-out.
 */
function actionWorlds(
  dataset: Dataset,
  credences: Credences,
  weights: ValueVector,
  evaluator: Evaluator,
  action: Action,
  given: Pins,
): { worlds: ActionWorld[]; condIds: FactorId[] } {
  const condIds = conditionFactorIds(dataset, given);
  const scenarios = analyze(dataset, credences, weights, evaluator, given).scenarios;
  const probByKey: Record<string, number> = {};
  const pinsByKey: Record<string, Pins> = {};
  for (const s of scenarios) {
    const key = condIds.map((id) => s.scenario[id]).join('|');
    probByKey[key] = (probByKey[key] ?? 0) + s.probability;
    if (!pinsByKey[key]) {
      const p: Pins = { ...given };
      for (const id of condIds) p[id] = s.scenario[id];
      pinsByKey[key] = p;
    }
  }
  const shifted = dataset.actions.map((a) => ({ id: a.id, credences: applyAction(credences, a) }));
  const worlds: ActionWorld[] = [];
  for (const key of Object.keys(probByKey)) {
    const pins = pinsByKey[key];
    const baseEV = condMeanEV(dataset, credences, weights, evaluator, pins);
    let gainA = 0;
    let bestOther = 0; // do-nothing floor
    for (const s of shifted) {
      const g = condMeanEV(dataset, s.credences, weights, evaluator, pins) - baseEV;
      if (s.id === action.id) gainA = g;
      else bestOther = Math.max(bestOther, g);
    }
    worlds.push({ pins, prob: probByKey[key], margin: gainA - bestOther, gain: gainA });
  }
  return { worlds, condIds };
}

/**
 * Which quantity the action-conditions read-out aggregates:
 *  - 'margin' — the action's gain minus the best alternative (is it THE priority?)
 *  - 'gain'   — the action's absolute EV gain vs. doing nothing (is it beneficial, and
 *               how much?). A low best-lever share with a high positive-gain share means
 *               "helpful, just not the single best" — never "harmful".
 */
export type ActionMetric = 'margin' | 'gain';
const metricValue = (w: ActionWorld, metric: ActionMetric) => (metric === 'gain' ? w.gain : w.margin);

/** Probability-weighted mean of the selected metric over a subset of worlds (0 if massless). */
function meanMetric(worlds: ActionWorld[], metric: ActionMetric): number {
  const mass = worlds.reduce((a, w) => a + w.prob, 0);
  return mass > 0 ? worlds.reduce((a, w) => a + w.prob * metricValue(w, metric), 0) / mass : 0;
}

export interface ActionConditions {
  /** Which quantity the cruxes/lists/headline reflect. */
  metric: ActionMetric;
  /** Probability-weighted mean of the selected metric (the headline number). */
  mean: number;
  /** Share of condition-worlds where the selected metric is positive. */
  favorableShare: number;
  /** Always: share where the action is the single best lever (margin > 0). */
  bestLeverShare: number;
  /** Always: share where the action improves EV on its own (gain > 0). */
  positiveGainShare: number;
  /** Always: mean absolute gain vs. doing nothing. */
  meanGain: number;
  /** Always: mean margin over the best alternative. */
  meanMargin: number;
  /** Per objective factor, the selected metric conditioned on each state — the crux tornado. */
  cruxes: Crux[];
  favorableWhen: ConditionLine[];
  unfavorableWhen: ConditionLine[];
}

/** "Under what conditions is this action worth pursuing?" (metric picks the lens). */
export function actionConditions(
  dataset: Dataset,
  credences: Credences,
  weights: ValueVector,
  evaluator: Evaluator,
  action: Action,
  given: Pins = {},
  metric: ActionMetric = 'margin',
): ActionConditions {
  const { worlds, condIds } = actionWorlds(dataset, credences, weights, evaluator, action, given);
  const totP = worlds.reduce((a, w) => a + w.prob, 0) || 1;
  const meanMargin = worlds.reduce((a, w) => a + w.prob * w.margin, 0) / totP;
  const meanGain = worlds.reduce((a, w) => a + w.prob * w.gain, 0) / totP;
  const bestLeverShare = worlds.reduce((a, w) => a + (w.margin > 1e-9 ? w.prob : 0), 0) / totP;
  const positiveGainShare = worlds.reduce((a, w) => a + (w.gain > 1e-9 ? w.prob : 0), 0) / totP;
  const mean = metric === 'gain' ? meanGain : meanMargin;
  const favorableShare = metric === 'gain' ? positiveGainShare : bestLeverShare;

  const entries = condIds.map((fid) => {
    const factor = dataset.factors.find((f) => f.id === fid)!;
    return {
      factor,
      states: factor.states.map((st) => ({
        stateId: st.id,
        label: st.label,
        delta: meanMetric(worlds.filter((w) => w.pins[fid] === st.id), metric),
      })),
    };
  });

  return { metric, mean, favorableShare, bestLeverShare, positiveGainShare, meanGain, meanMargin, ...cruxTornado(entries) };
}

/** Just the prob-weighted mean of the selected metric — for fast credence sweeps. */
function actionMean(
  dataset: Dataset,
  credences: Credences,
  weights: ValueVector,
  evaluator: Evaluator,
  action: Action,
  given: Pins,
  metric: ActionMetric,
): number {
  const { worlds } = actionWorlds(dataset, credences, weights, evaluator, action, given);
  return meanMetric(worlds, metric);
}

/** Two-way map of an action's selected metric over two objective condition factors. */
export function actionContrastGrid(
  dataset: Dataset,
  credences: Credences,
  weights: ValueVector,
  evaluator: Evaluator,
  action: Action,
  f1Id: FactorId,
  f2Id: FactorId,
  given: Pins = {},
  metric: ActionMetric = 'margin',
): ContrastGrid | null {
  const f1 = dataset.factors.find((f) => f.id === f1Id);
  const f2 = dataset.factors.find((f) => f.id === f2Id);
  if (!f1 || !f2 || f1.id === f2.id) return null;
  const { worlds, condIds } = actionWorlds(dataset, credences, weights, evaluator, action, given);
  if (!condIds.includes(f1Id) || !condIds.includes(f2Id)) return null;
  return buildGrid(f1, f2, (s1, s2) =>
    meanMetric(worlds.filter((w) => w.pins[f1.id] === s1 && w.pins[f2.id] === s2), metric),
  );
}

/** "How sure would you need to be?" for an action — sweep an objective factor's credence. */
export function actionBeliefThreshold(
  dataset: Dataset,
  credences: Credences,
  weights: ValueVector,
  evaluator: Evaluator,
  action: Action,
  sweepFactor: FactorId,
  sweepState: StateId,
  given: Pins = {},
  metric: ActionMetric = 'margin',
): BeliefThreshold {
  const steps = 20;
  const dist = credences[sweepFactor] ?? {};
  const points: ThresholdPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const cred: Credences = { ...credences, [sweepFactor]: withMarginal(dist, sweepState, p) };
    points.push({ p, netDelta: actionMean(dataset, cred, weights, evaluator, action, given, metric) });
  }
  return {
    sweepFactor,
    sweepState,
    currentP: dist[sweepState] ?? 0,
    netDeltaAtCurrent: actionMean(dataset, credences, weights, evaluator, action, given, metric),
    points,
    crossings: findCrossings(points),
  };
}
