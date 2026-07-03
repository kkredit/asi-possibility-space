import type { BayesNet, Credences, Factor, FactorId, Scenario, StateId } from '@model/types';
import { enumerateScenarios, scenarioKey } from '@engine/scenarios';
import { bayesNetProbability } from '@engine/bayesnet';

export type Marginals = Record<FactorId, Record<StateId, number>>;

export interface ReconciledJoint {
  /** Joint probability per scenario, keyed by scenarioKey. Sums to 1. */
  prob: Map<string, number>;
  /** P(scenario) for use as an analyze() joint override. */
  probability: (s: Scenario) => number;
  /** Implied marginal of every factor under the reconciled joint. */
  marginals: Marginals;
  /** Whether IPF reached the tolerance (false ⇒ hit the iteration cap). */
  converged: boolean;
}

/**
 * Soft evidence by Iterative Proportional Fitting ("raking").
 *
 * The Bayes net's CPTs define the *relationships* between factors; the user's
 * slider values are *target marginals* on whichever factors they've touched. IPF
 * returns the joint closest (minimum KL divergence) to the net's base joint whose
 * marginals match every target — so the associations are preserved while *untouched*
 * factors (e.g. the parents of a child you just slid) move to stay consistent.
 *
 * This is what makes child sliders "soft evidence": setting P(alignment-in-time = yes)
 * high raises P(slow takeoff) and P(easy tractability), because the net says those are
 * what make alignment likely. Roots and children are treated identically — every
 * touched factor is just a marginal constraint.
 *
 * `referencePriors` seed the net's root priors for the base joint (the default world
 * before any constraint); they wash out for any factor that carries a target.
 */
export function reconcileJoint(
  net: BayesNet,
  factors: Factor[],
  referencePriors: Credences,
  targets: Marginals,
  maxIters = 200,
  tol = 1e-12,
): ReconciledJoint {
  const scenarios = enumerateScenarios(factors);
  const n = scenarios.length;

  // Base joint from the net (associations + reference root priors), normalized.
  // Typed arrays + precomputed state indices: IPF is pure array arithmetic.
  const p = new Float64Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    p[i] = bayesNetProbability(net, scenarios[i], referencePriors);
    total += p[i];
  }
  if (total > 0) for (let i = 0; i < n; i++) p[i] /= total;

  const targetFactors = Object.keys(targets).filter(
    (f) => targets[f] && Object.keys(targets[f]).length > 0,
  );

  // Per target factor: each scenario's state index + the target per state.
  const layout = targetFactors.map((f) => {
    const factor = factors.find((x) => x.id === f)!;
    const stateIds = factor.states.map((st) => st.id);
    const pos = new Map(stateIds.map((sid, i) => [sid, i]));
    const idx = new Uint8Array(n);
    for (let i = 0; i < n; i++) idx[i] = pos.get(scenarios[i][f]) ?? 0;
    const target = stateIds.map((sid) => targets[f][sid] ?? 0);
    return { idx, target, k: stateIds.length };
  });

  let converged = true;
  if (layout.length > 0) {
    converged = false;
    const cur = new Float64Array(4); // ≤ 3 states per factor today; 4 is headroom
    const scale = new Float64Array(4);
    for (let iter = 0; iter < maxIters; iter++) {
      let maxDelta = 0;
      for (const { idx, target, k } of layout) {
        cur.fill(0, 0, k);
        for (let i = 0; i < n; i++) cur[idx[i]] += p[i];
        for (let st = 0; st < k; st++) {
          maxDelta = Math.max(maxDelta, Math.abs(target[st] - cur[st]));
          scale[st] = cur[st] > 0 ? target[st] / cur[st] : 0;
        }
        for (let i = 0; i < n; i++) p[i] *= scale[idx[i]];
      }
      // Guard renormalization (each factor rescale preserves total ≈ 1, but drift).
      let t = 0;
      for (let i = 0; i < n; i++) t += p[i];
      if (t > 0) for (let i = 0; i < n; i++) p[i] /= t;
      if (maxDelta < tol) {
        converged = true;
        break;
      }
    }
  }

  // Keyed map for the probability() accessor (scenarioKey is memoized per object).
  const prob = new Map<string, number>();
  for (let i = 0; i < n; i++) prob.set(scenarioKey(scenarios[i]), p[i]);

  // Implied marginals.
  const marginals: Marginals = {};
  for (const f of factors) {
    marginals[f.id] = {};
    for (const st of f.states) marginals[f.id][st.id] = 0;
  }
  for (let i = 0; i < n; i++) {
    for (const f of factors) marginals[f.id][scenarios[i][f.id]] += p[i];
  }

  return {
    prob,
    probability: (s: Scenario) => prob.get(scenarioKey(s)) ?? 0,
    marginals,
    converged,
  };
}
