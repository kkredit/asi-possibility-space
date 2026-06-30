import { create } from 'zustand';
import type { Credences, FactorId, Scenario, StateId, ValueDimensionId, ValueVector } from '@model/types';
import { dataset } from '@model/dataset';
import { presets } from '@model/presets';
import type { Pins } from '@engine/scenarios';
import { reconcileJoint, type Marginals } from '@engine/softevidence';

export type ProbabilityModel = 'independence' | 'bayesNet';

export interface BeliefState {
  credences: Credences;
  weights: ValueVector;
  evaluatorId: string;
  pins: Pins;
  /** Which preset the current credences came from, or null once edited. */
  activePresetId: string | null;

  /** Probability model: independence×couplings (default) or the Bayes net. */
  probabilityModel: ProbabilityModel;
  /** Soft-evidence targets per touched factor (Bayes-net mode). Keys = touched. */
  targets: Marginals;
  /** Reconciled display marginals (Bayes-net mode); equals credences in independence. */
  bayesMarginals: Marginals;
  /** Reconciled joint accessor for analyze (Bayes-net mode), else null. */
  bayesProbability: ((s: Scenario) => number) | null;

  setCredence: (factor: FactorId, state: StateId, value: number) => void;
  setWeight: (dim: ValueDimensionId, value: number) => void;
  setEvaluator: (id: string) => void;
  setPin: (factor: FactorId, state: StateId | null) => void;
  applyPreset: (id: string) => void;
  setProbabilityModel: (model: ProbabilityModel) => void;
  /** Set a soft-evidence target marginal on a factor (Bayes-net mode). */
  setMarginalTarget: (factor: FactorId, state: StateId, value: number) => void;
  reset: () => void;
}

/**
 * Set one state's probability and redistribute the remainder across the other
 * states in proportion to their current values (so the distribution stays valid).
 */
function setStateProbability(
  dist: Record<StateId, number>,
  state: StateId,
  value: number,
): Record<StateId, number> {
  const v = Math.max(0, Math.min(1, value));
  const others = Object.keys(dist).filter((s) => s !== state);
  const remaining = 1 - v;
  const priorOthers = others.reduce((sum, s) => sum + dist[s], 0);
  const next: Record<StateId, number> = { [state]: v };
  for (const s of others) {
    next[s] = priorOthers > 0 ? remaining * (dist[s] / priorOthers) : remaining / others.length;
  }
  return next;
}

/** Read a `#preset=<id>` from the URL (SSR-safe); only returns known preset ids. */
function readUrlPresetId(): string | null {
  if (typeof window === 'undefined') return null;
  const id = window.location.hash.match(/preset=([A-Za-z0-9_-]+)/)?.[1];
  return id && presets.some((p) => p.id === id) ? id : null;
}

/** Reflect the active preset in the URL so a chosen figure is shareable (SSR-safe). */
function writeUrlPresetId(id: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.hash = id ? `preset=${id}` : '';
  window.history.replaceState(null, '', url.toString());
}

function presetCredencesWeights(id: string) {
  const preset = presets.find((p) => p.id === id)!;
  return {
    // Factors a preset doesn't state (e.g. a newer factor like coordination) fall
    // back to the dataset baseline, so every factor always has a full distribution.
    credences: { ...structuredClone(dataset.baselineCredences), ...structuredClone(preset.credences) },
    weights: preset.weights ? { ...preset.weights } : { ...dataset.defaultWeights },
  };
}

/** Reconcile soft-evidence targets against the net into display marginals + a joint. */
function reconcile(targets: Marginals): {
  bayesMarginals: Marginals;
  bayesProbability: ((s: Scenario) => number) | null;
} {
  const net = dataset.bayesNet;
  if (!net) return { bayesMarginals: {}, bayesProbability: null };
  const r = reconcileJoint(net, dataset.factors, dataset.baselineCredences, targets);
  return { bayesMarginals: r.marginals, bayesProbability: r.probability };
}

function baselineState() {
  return {
    credences: structuredClone(dataset.baselineCredences),
    weights: { ...dataset.defaultWeights },
    evaluatorId: 'cached',
    pins: {} as Pins,
    activePresetId: null as string | null,
    probabilityModel: 'independence' as ProbabilityModel,
    targets: {} as Marginals,
    bayesMarginals: {} as Marginals,
    bayesProbability: null as ((s: Scenario) => number) | null,
  };
}

/** Initial state honors a shared `#preset=<id>` URL if present. */
function initialState() {
  const urlId = readUrlPresetId();
  if (urlId) return { ...baselineState(), activePresetId: urlId, ...presetCredencesWeights(urlId) };
  return baselineState();
}

export const useBeliefs = create<BeliefState>((set) => ({
  ...initialState(),

  // Manual credence/weight edits mean the beliefs no longer match a preset.
  setCredence: (factor, state, value) =>
    set((s) => {
      if (s.activePresetId) writeUrlPresetId(null);
      return {
        activePresetId: null,
        credences: { ...s.credences, [factor]: setStateProbability(s.credences[factor], state, value) },
      };
    }),

  setWeight: (dim, value) =>
    set((s) => {
      if (s.activePresetId) writeUrlPresetId(null);
      return { activePresetId: null, weights: { ...s.weights, [dim]: Math.max(0, value) } };
    }),

  setEvaluator: (id) => set({ evaluatorId: id }),

  setPin: (factor, state) =>
    set((s) => {
      const pins = { ...s.pins };
      if (state === null) delete pins[factor];
      else pins[factor] = state;
      return { pins };
    }),

  applyPreset: (id) => {
    if (!presets.some((p) => p.id === id)) return;
    writeUrlPresetId(id);
    // Presets are marginal credences — they describe an independence-style belief set.
    set({ activePresetId: id, probabilityModel: 'independence', bayesProbability: null, ...presetCredencesWeights(id) });
  },

  setProbabilityModel: (model) =>
    set(() =>
      model === 'bayesNet'
        ? { probabilityModel: 'bayesNet', targets: {}, ...reconcile({}) }
        : { probabilityModel: 'independence', bayesProbability: null },
    ),

  // Soft evidence: set a target marginal on one factor, then re-rake the joint so the
  // untouched factors move to stay consistent with the net's relationships.
  setMarginalTarget: (factor, state, value) =>
    set((s) => {
      if (s.probabilityModel !== 'bayesNet') return {};
      const cur = s.bayesMarginals[factor] ?? dataset.baselineCredences[factor];
      const targets = { ...s.targets, [factor]: setStateProbability(cur, state, value) };
      return { targets, ...reconcile(targets) };
    }),

  reset: () => {
    writeUrlPresetId(null);
    set((s) =>
      s.probabilityModel === 'bayesNet'
        ? { ...baselineState(), probabilityModel: 'bayesNet', targets: {}, ...reconcile({}) }
        : baselineState(),
    );
  },
}));
