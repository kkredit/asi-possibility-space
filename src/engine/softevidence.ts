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
  const items = scenarios.map((s) => ({ s, k: scenarioKey(s) }));

  // Base joint from the net (associations + reference root priors), normalized.
  const prob = new Map<string, number>();
  let total = 0;
  for (const { s, k } of items) {
    const p = bayesNetProbability(net, s, referencePriors);
    prob.set(k, p);
    total += p;
  }
  if (total > 0) for (const { k } of items) prob.set(k, prob.get(k)! / total);

  const targetFactors = Object.keys(targets).filter(
    (f) => targets[f] && Object.keys(targets[f]).length > 0,
  );

  let converged = true;
  if (targetFactors.length > 0) {
    converged = false;
    for (let iter = 0; iter < maxIters; iter++) {
      let maxDelta = 0;
      for (const f of targetFactors) {
        // Current marginal of f under the working joint.
        const cur: Record<string, number> = {};
        for (const { s, k } of items) {
          const st = s[f];
          cur[st] = (cur[st] ?? 0) + prob.get(k)!;
        }
        // Track how far this factor's marginal is from its target, then rescale.
        for (const st of Object.keys(cur)) {
          maxDelta = Math.max(maxDelta, Math.abs((targets[f][st] ?? 0) - cur[st]));
        }
        for (const { s, k } of items) {
          const st = s[f];
          const c = cur[st];
          const scale = c > 0 ? (targets[f][st] ?? 0) / c : 0;
          prob.set(k, prob.get(k)! * scale);
        }
      }
      // Guard renormalization (each factor rescale preserves total ≈ 1, but drift).
      let t = 0;
      for (const v of prob.values()) t += v;
      if (t > 0) for (const { k } of items) prob.set(k, prob.get(k)! / t);
      if (maxDelta < tol) {
        converged = true;
        break;
      }
    }
  }

  // Implied marginals.
  const marginals: Marginals = {};
  for (const f of factors) {
    marginals[f.id] = {};
    for (const st of f.states) marginals[f.id][st.id] = 0;
  }
  for (const { s, k } of items) {
    const p = prob.get(k)!;
    for (const f of factors) marginals[f.id][s[f.id]] += p;
  }

  return {
    prob,
    probability: (s: Scenario) => prob.get(scenarioKey(s)) ?? 0,
    marginals,
    converged,
  };
}
