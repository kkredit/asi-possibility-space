import type {
  BayesNet,
  Credences,
  Dataset,
  Evaluator,
  Scenario,
  ValueVector,
} from '@model/types';
import {
  couplingMultiplier,
  enumerateScenarios,
  scenarioProbability,
  type Pins,
} from '@engine/scenarios';
import { bayesNetProbability } from '@engine/bayesnet';
import { cachedEvaluator, isReasoned } from '@engine/evaluators';
import { scalarize, VALUE_DIMENSION_IDS } from '@engine/value';

export interface EvaluatedScenario {
  scenario: Scenario;
  probability: number;
  value: ValueVector;
  scalar: number;
  narrative: string;
  reasoned: boolean;
}

export interface Analysis {
  scenarios: EvaluatedScenario[];
  /** Probability-weighted mean value vector. */
  evVector: ValueVector;
  /** Scalar expected value in [-1, 1]. */
  ev: number;
  /** Total probability mass covered (≈1; <1 only if credences don't sum to 1). */
  totalProbability: number;
}

const ZERO: ValueVector = { survival: 0, agency: 0, suffering: 0, flourishing: 0 };

export function analyze(
  dataset: Dataset,
  credences: Credences,
  weights: ValueVector,
  evaluator: Evaluator,
  pins: Pins = {},
  /** Opt-in probability model. When supplied, the joint comes from the Bayes net
   *  (P(scenario) = ∏ P(state | parents)) instead of independence×couplings. Both
   *  share the same contract: probabilities sum to the pinned states' marginal mass
   *  (1 with no pins). Defaults off, so every existing caller is unaffected. */
  net?: BayesNet,
  /** Most general probability source: a precomputed joint P(scenario). Takes
   *  precedence over `net` and independence×couplings. Used by the soft-evidence
   *  (IPF-reconciled) model, where the joint can't be factored into marginals. */
  jointProbability?: (s: Scenario) => number,
): Analysis {
  // Independent prior × coupling correction, then renormalized so the coupled
  // distribution carries the same total mass as the independent one (couplings
  // redistribute mass between scenarios; they never create or destroy it). With
  // no pins that total is 1; with pins it is the pinned states' marginal mass. Under
  // the Bayes-net model the net IS the joint, so we read it directly — no renorm.
  const couplings = dataset.couplings ?? [];
  const enumerated = enumerateScenarios(dataset.factors, pins).map((scenario) => {
    if (jointProbability) return { scenario, prior: 0, coupled: jointProbability(scenario) };
    if (net) return { scenario, prior: 0, coupled: bayesNetProbability(net, scenario, credences) };
    const prior = scenarioProbability(scenario, credences);
    return { scenario, prior, coupled: prior * couplingMultiplier(scenario, couplings) };
  });
  const priorMass = enumerated.reduce((a, s) => a + s.prior, 0);
  const coupledMass = enumerated.reduce((a, s) => a + s.coupled, 0);
  // A precomputed joint (jointProbability) or the Bayes net is already correct, so the
  // renorm is the identity. Otherwise rescale the coupled mass back to the prior mass.
  const renorm = net || jointProbability ? 1 : coupledMass > 0 ? priorMass / coupledMass : 0;

  const scenarios = enumerated.map(({ scenario, coupled }) => {
    const probability = coupled * renorm;
    const outcome = evaluator.evaluate(scenario, dataset) ?? { narrative: '', value: ZERO };
    return {
      scenario,
      probability,
      value: outcome.value,
      scalar: scalarize(outcome.value, weights),
      narrative: outcome.narrative,
      reasoned: isReasoned(scenario, dataset),
    };
  });

  const evVector: ValueVector = { ...ZERO };
  let ev = 0;
  let totalProbability = 0;
  for (const s of scenarios) {
    totalProbability += s.probability;
    ev += s.probability * s.scalar;
    for (const id of VALUE_DIMENSION_IDS) evVector[id] += s.probability * s.value[id];
  }

  return { scenarios, evVector, ev, totalProbability };
}

/**
 * How far an evaluator sits from the hand-reasoned (cached) surface, measured as
 * root-mean-square divergence over every cell the cached evaluator actually has an
 * opinion on. Reported both in value-vector space (weight-independent, the quantity
 * the fitted models minimise) and in scalar space under the supplied weights (what
 * the EV the user sees actually depends on). This is the yardstick behind the
 * "model ladder": fit each evaluator, see how much of the surface it can't capture.
 */
export interface EvaluatorFit {
  evaluatorId: string;
  label: string;
  /** RMS over the four value dimensions — independent of weights. */
  vectorRms: number;
  /** RMS of the scalarised value under the current weights. */
  scalarRms: number;
  /** Number of cells compared (cells the cached evaluator has reasoned). */
  cells: number;
}

export function evaluatorFit(
  dataset: Dataset,
  evaluator: Evaluator,
  weights: ValueVector,
): EvaluatorFit {
  let vsse = 0;
  let ssse = 0;
  let cells = 0;
  for (const scenario of enumerateScenarios(dataset.factors)) {
    if (!isReasoned(scenario, dataset)) continue;
    const a = evaluator.evaluate(scenario, dataset)?.value ?? ZERO;
    const b = cachedEvaluator.evaluate(scenario, dataset)?.value ?? ZERO;
    cells++;
    for (const id of VALUE_DIMENSION_IDS) vsse += (a[id] - b[id]) ** 2;
    ssse += (scalarize(a, weights) - scalarize(b, weights)) ** 2;
  }
  const n = Math.max(1, cells);
  return {
    evaluatorId: evaluator.id,
    label: evaluator.label,
    vectorRms: Math.sqrt(vsse / (n * VALUE_DIMENSION_IDS.length)),
    scalarRms: Math.sqrt(ssse / n),
    cells,
  };
}

/** Bucket scenarios by scalar value into a histogram for the EV distribution. */
export interface DistributionBin {
  lo: number;
  hi: number;
  probability: number;
}

export function distribution(scenarios: EvaluatedScenario[], binCount = 10): DistributionBin[] {
  const bins: DistributionBin[] = [];
  const width = 2 / binCount;
  for (let i = 0; i < binCount; i++) {
    bins.push({ lo: -1 + i * width, hi: -1 + (i + 1) * width, probability: 0 });
  }
  for (const s of scenarios) {
    let idx = Math.floor((s.scalar + 1) / width);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    bins[idx].probability += s.probability;
  }
  return bins;
}
