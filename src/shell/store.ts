import { create } from 'zustand';
import type { Credences, FactorId, Scenario, StateId, ValueDimensionId, ValueVector } from '@model/types';
import { dataset } from '@model/dataset';
import { presets } from '@model/presets';
import type { Pins } from '@engine/scenarios';
import { reconcileJoint } from '@engine/softevidence';

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
  /** Bayes-net joint accessor for analyze — the net's correlation structure raked to
   *  the current credence marginals. Null in independence mode. */
  bayesProbability: ((s: Scenario) => number) | null;

  setCredence: (factor: FactorId, state: StateId, value: number) => void;
  setWeight: (dim: ValueDimensionId, value: number) => void;
  setEvaluator: (id: string) => void;
  setPin: (factor: FactorId, state: StateId | null) => void;
  applyPreset: (id: string) => void;
  setProbabilityModel: (model: ProbabilityModel) => void;
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

/**
 * The Bayes-net joint for the given credences: the net's causal correlation
 * structure raked (IPF) to match the current credence marginals. So net mode shows
 * the SAME marginal beliefs as independence, but the joint knows the factors
 * co-occur (e.g. alignment and control fail together) — which shifts EV and the
 * doom-corner mass. Returns null when there's no net. */
function netJoint(credences: Credences): ((s: Scenario) => number) | null {
  const net = dataset.bayesNet;
  if (!net) return null;
  // Reference priors from the credences (roots), then rake ALL marginals to the
  // credences so net mode faithfully reflects the user's / preset's beliefs.
  return reconcileJoint(net, dataset.factors, credences, credences).probability;
}

function baselineState() {
  return {
    credences: structuredClone(dataset.baselineCredences),
    weights: { ...dataset.defaultWeights },
    evaluatorId: 'cached',
    pins: {} as Pins,
    activePresetId: null as string | null,
    probabilityModel: 'independence' as ProbabilityModel,
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
      const credences = { ...s.credences, [factor]: setStateProbability(s.credences[factor], state, value) };
      return {
        activePresetId: null,
        credences,
        bayesProbability: s.probabilityModel === 'bayesNet' ? netJoint(credences) : null,
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
    const { credences, weights } = presetCredencesWeights(id);
    set((s) => ({
      activePresetId: id,
      credences,
      weights,
      bayesProbability: s.probabilityModel === 'bayesNet' ? netJoint(credences) : null,
    }));
  },

  setProbabilityModel: (model) =>
    set((s) => ({
      probabilityModel: model,
      bayesProbability: model === 'bayesNet' ? netJoint(s.credences) : null,
    })),

  reset: () => {
    writeUrlPresetId(null);
    set(baselineState());
  },
}));
