import { create } from 'zustand';
import type { Credences, FactorId, Scenario, StateId, ValueDimensionId, ValueVector } from '@model/types';
import { dataset } from '@model/dataset';
import { presets } from '@model/presets';
import type { Pins } from '@engine/scenarios';
import { withMarginal } from '@engine/actions';
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

/** Read a `#preset=<id>` from the URL (SSR-safe); only returns known preset ids. */
function readUrlPresetId(): string | null {
  if (typeof window === 'undefined') return null;
  const id = window.location.hash.match(/preset=([A-Za-z0-9_-]+)/)?.[1];
  return id && presets.some((p) => p.id === id) ? id : null;
}

/**
 * Set (or clear) one `#`-hash param, preserving the others — the hash is shared
 * with e.g. the active `tab`, so we must not clobber the whole thing. SSR-safe.
 */
export function setHashParam(key: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.hash.replace(/^#/, ''));
  if (value) params.set(key, value);
  else params.delete(key);
  url.hash = params.toString();
  window.history.replaceState(null, '', url.toString());
}

/** Reflect the active preset in the URL so a chosen figure is shareable (SSR-safe). */
function writeUrlPresetId(id: string | null): void {
  setHashParam('preset', id);
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
  // The Bayes net is the default probability model: it's the principled joint (factors
  // co-occur), and independence×couplings is the opt-out. Falls back to independence
  // only if the dataset ships no net.
  const credences = structuredClone(dataset.baselineCredences);
  const probabilityModel: ProbabilityModel = dataset.bayesNet ? 'bayesNet' : 'independence';
  return {
    credences,
    weights: { ...dataset.defaultWeights },
    evaluatorId: 'cached',
    pins: {} as Pins,
    activePresetId: null as string | null,
    probabilityModel,
    bayesProbability: probabilityModel === 'bayesNet' ? netJoint(credences) : null,
  };
}

/** Initial state honors a shared `#preset=<id>` URL if present. */
function initialState() {
  const urlId = readUrlPresetId();
  const state = baselineState();
  if (!urlId) return state;
  const { credences, weights } = presetCredencesWeights(urlId);
  return {
    ...state,
    activePresetId: urlId,
    credences,
    weights,
    // Re-rake the Bayes-net joint to the preset's marginals — leaving the baseline
    // joint here would render a shared preset link with the wrong EV/p(doom).
    bayesProbability: state.probabilityModel === 'bayesNet' ? netJoint(credences) : null,
  };
}

export const useBeliefs = create<BeliefState>((set) => ({
  ...initialState(),

  // Manual credence/weight edits mean the beliefs no longer match a preset.
  setCredence: (factor, state, value) =>
    set((s) => {
      if (s.activePresetId) writeUrlPresetId(null);
      const credences = { ...s.credences, [factor]: withMarginal(s.credences[factor], state, value) };
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
