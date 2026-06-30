import type {
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
import { isReasoned } from '@engine/evaluators';
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
): Analysis {
  // Independent prior × coupling correction, then renormalized so the coupled
  // distribution carries the same total mass as the independent one (couplings
  // redistribute mass between scenarios; they never create or destroy it). With
  // no pins that total is 1; with pins it is the pinned states' marginal mass.
  const couplings = dataset.couplings ?? [];
  const enumerated = enumerateScenarios(dataset.factors, pins).map((scenario) => {
    const prior = scenarioProbability(scenario, credences);
    return { scenario, prior, coupled: prior * couplingMultiplier(scenario, couplings) };
  });
  const priorMass = enumerated.reduce((a, s) => a + s.prior, 0);
  const coupledMass = enumerated.reduce((a, s) => a + s.coupled, 0);
  const renorm = coupledMass > 0 ? priorMass / coupledMass : 0;

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
