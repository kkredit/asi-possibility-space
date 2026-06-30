import type { BayesNet, Credences, Factor, FactorId, Scenario, StateId } from '@model/types';
import { enumerateScenarios } from '@engine/scenarios';

/**
 * Bayes-net probability model — the principled successor to independence×couplings
 * (see docs/MODEL.md §5). A directed acyclic graph over the factors with a
 * conditional probability table (CPT) at each node defines the joint exactly:
 *
 *     P(scenario) = ∏_f  P(state_f | parents(f))
 *
 * Root nodes (no parents) read their prior live from the user's credences, so the
 * sliders on root factors remain the root marginals. Child nodes read their CPT.
 * Evaluating the joint of a fully-specified scenario is just a product over nodes —
 * order-independent — so no topological sort is needed here (only for validation).
 */

/** Key into a node's CPT for a given scenario: parent states joined in parent order. */
function cptKey(parents: FactorId[], scenario: Scenario): string {
  return parents.map((p) => scenario[p]).join('|');
}

/** The conditional distribution a node assigns, given the rest of the scenario. */
function nodeDistribution(
  node: BayesNet['nodes'][number],
  scenario: Scenario,
  credences: Credences,
): Record<StateId, number> | undefined {
  if (node.parents.length === 0) return credences[node.factor];
  return node.cpt?.[cptKey(node.parents, scenario)];
}

/**
 * Joint probability of a fully-specified scenario under the net. Root priors come
 * from `credences`; child probabilities from their CPTs. Returns 0 if any required
 * conditional is missing (an invalid/incomplete net — catch it with validateBayesNet).
 */
export function bayesNetProbability(
  net: BayesNet,
  scenario: Scenario,
  credences: Credences,
): number {
  let p = 1;
  for (const node of net.nodes) {
    const dist = nodeDistribution(node, scenario, credences);
    const q = dist?.[scenario[node.factor]];
    if (!q) return 0;
    p *= q;
  }
  return p;
}

/**
 * The marginal distribution the net implies for every factor, by enumerating the
 * full joint. For root factors this returns (close to) the credences; for children
 * it's the implied marginal after the CPTs act. Useful for validation and for a
 * future UI that shows how child sliders are determined rather than set.
 */
export function bayesNetMarginals(
  net: BayesNet,
  factors: Factor[],
  credences: Credences,
): Record<FactorId, Record<StateId, number>> {
  const out: Record<FactorId, Record<StateId, number>> = {};
  for (const f of factors) {
    out[f.id] = {};
    for (const s of f.states) out[f.id][s.id] = 0;
  }
  for (const scenario of enumerateScenarios(factors)) {
    const p = bayesNetProbability(net, scenario, credences);
    for (const f of factors) out[f.id][scenario[f.id]] += p;
  }
  return out;
}

export interface BayesNetValidation {
  ok: boolean;
  errors: string[];
}

/**
 * Structural + numerical validation: every factor has exactly one node; parents are
 * real and acyclic; each child's CPT covers every parent-state combination with rows
 * over the node's own states that sum to 1. Roots may omit a CPT (prior = credences).
 */
export function validateBayesNet(net: BayesNet, factors: Factor[]): BayesNetValidation {
  const errors: string[] = [];
  const byId = new Map(factors.map((f) => [f.id, f]));
  const nodeFor = new Map(net.nodes.map((n) => [n.factor, n]));

  for (const f of factors) if (!nodeFor.has(f.id)) errors.push(`no node for factor "${f.id}"`);
  for (const node of net.nodes) {
    if (!byId.has(node.factor)) {
      errors.push(`node references unknown factor "${node.factor}"`);
      continue;
    }
    for (const p of node.parents) {
      if (!byId.has(p)) errors.push(`"${node.factor}" has unknown parent "${p}"`);
      if (p === node.factor) errors.push(`"${node.factor}" is its own parent`);
    }
    // CPT completeness: every combination of parent states, each row a distribution.
    if (node.parents.length > 0) {
      const parentFactors = node.parents.map((p) => byId.get(p)).filter(Boolean) as Factor[];
      if (parentFactors.length === node.parents.length) {
        const combos = parentFactors.reduce<string[]>(
          (acc, pf) => acc.flatMap((prefix) => pf.states.map((s) => (prefix ? `${prefix}|${s.id}` : s.id))),
          [''],
        );
        const own = byId.get(node.factor)!;
        for (const key of combos) {
          const row = node.cpt?.[key];
          if (!row) {
            errors.push(`"${node.factor}" CPT missing row for parents "${key}"`);
            continue;
          }
          const sum = own.states.reduce((a, s) => a + (row[s.id] ?? 0), 0);
          if (Math.abs(sum - 1) > 1e-6) errors.push(`"${node.factor}" CPT row "${key}" sums to ${sum.toFixed(4)}, not 1`);
        }
      }
    }
  }

  // Acyclicity (Kahn's algorithm over the parent edges).
  const indeg = new Map<FactorId, number>();
  const children = new Map<FactorId, FactorId[]>();
  for (const n of net.nodes) indeg.set(n.factor, 0);
  for (const n of net.nodes) {
    for (const p of n.parents) {
      indeg.set(n.factor, (indeg.get(n.factor) ?? 0) + 1);
      children.set(p, [...(children.get(p) ?? []), n.factor]);
    }
  }
  const queue = [...indeg.entries()].filter(([, d]) => d === 0).map(([f]) => f);
  let visited = 0;
  while (queue.length) {
    const f = queue.shift()!;
    visited++;
    for (const c of children.get(f) ?? []) {
      indeg.set(c, (indeg.get(c) ?? 0) - 1);
      if (indeg.get(c) === 0) queue.push(c);
    }
  }
  if (visited !== net.nodes.length) errors.push('the net has a cycle (not a DAG)');

  return { ok: errors.length === 0, errors };
}
