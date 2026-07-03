import type {
  Credences,
  Dataset,
  Derivation,
  StateId,
  SubCredences,
  Subfactor,
} from '@model/types';

/**
 * The belief-layer sub-model: subfactors don't enter the scenario space; instead
 * each `Derivation` computes a parent factor's credences from the sub-beliefs.
 * Everything downstream (analyze, couplings, Bayes-net raking) is unchanged —
 * derived parents are just marginals like any other.
 */

/** Enumerate all state-combos of the given subfactors (same shape as scenarios). */
function subCombos(subs: Subfactor[]): Record<string, StateId>[] {
  let combos: Record<string, StateId>[] = [{}];
  for (const s of subs) {
    const next: Record<string, StateId>[] = [];
    for (const partial of combos) {
      for (const st of s.states) next.push({ ...partial, [s.id]: st.id });
    }
    combos = next;
  }
  return combos;
}

/** P(combo) under independent sub-credences. */
function comboProb(combo: Record<string, StateId>, sub: SubCredences): number {
  let p = 1;
  for (const id of Object.keys(combo)) p *= sub[id]?.[combo[id]] ?? 0;
  return p;
}

/** Apply one derivation to produce the parent factor's credence distribution. */
export function deriveFactor(
  derivation: Derivation,
  dataset: Dataset,
  subCredences: SubCredences,
  credences: Credences,
): Record<StateId, number> {
  if (derivation.kind === 'cpt') {
    const subs = derivation.parents.map((id) => dataset.subfactors!.find((s) => s.id === id)!);
    const out: Record<StateId, number> = {};
    for (const combo of subCombos(subs)) {
      const p = comboProb(combo, subCredences);
      if (p === 0) continue;
      const key = derivation.parents.map((id) => combo[id]).join('|');
      const row = derivation.cpt[key];
      if (!row) continue;
      for (const st of Object.keys(row)) out[st] = (out[st] ?? 0) + p * row[st];
    }
    // Rows are distributions and combo mass sums to 1, so this is ≈1 already.
    const total = Object.values(out).reduce((a, b) => a + b, 0);
    if (total > 0) for (const st of Object.keys(out)) out[st] /= total;
    return out;
  }

  // gatedOdds: odds(yes) = baseOdds × ∏ E[multiplier(areaState, gateState)].
  let odds = derivation.baseOdds;
  for (const term of derivation.terms) {
    const areaDist = subCredences[term.area] ?? {};
    const gateDist = term.gateIsFactor ? credences[term.gate] ?? {} : subCredences[term.gate] ?? {};
    let expected = 0;
    let mass = 0;
    for (const a of Object.keys(areaDist)) {
      for (const g of Object.keys(gateDist)) {
        const w = areaDist[a] * gateDist[g];
        expected += w * (term.multipliers[`${a}|${g}`] ?? 1);
        mass += w;
      }
    }
    if (mass > 0) odds *= expected / mass;
  }
  for (const mod of derivation.modifiers ?? []) {
    const dist = credences[mod.factor] ?? {};
    let expected = 0;
    let mass = 0;
    for (const st of Object.keys(dist)) {
      expected += dist[st] * (mod.multipliers[st] ?? 1);
      mass += dist[st];
    }
    if (mass > 0) odds *= expected / mass;
  }
  const yes = odds / (1 + odds);
  return { [derivation.yesState]: yes, [derivation.noState]: 1 - yes };
}

/**
 * The credences with every derived parent overwritten from the sub-beliefs.
 * Identity when the dataset ships no sub-layer.
 */
export function deriveCredences(
  dataset: Dataset,
  credences: Credences,
  subCredences: SubCredences,
): Credences {
  if (!dataset.derivations?.length || !dataset.subfactors?.length) return credences;
  const next: Credences = { ...credences };
  for (const d of dataset.derivations) {
    next[d.factor] = deriveFactor(d, dataset, subCredences, next);
  }
  return next;
}

/** The factor ids owned by the sub-layer (their credences are derived). */
export function derivedFactorIds(dataset: Dataset): Set<string> {
  return new Set((dataset.derivations ?? []).map((d) => d.factor));
}
