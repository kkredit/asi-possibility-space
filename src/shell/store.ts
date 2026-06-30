import { create } from 'zustand';
import type { Credences, FactorId, StateId, ValueDimensionId, ValueVector } from '@model/types';
import { dataset } from '@model/dataset';
import { presets } from '@model/presets';
import type { Pins } from '@engine/scenarios';

export interface BeliefState {
  credences: Credences;
  weights: ValueVector;
  evaluatorId: string;
  pins: Pins;
  /** Which preset the current credences came from, or null once edited. */
  activePresetId: string | null;

  setCredence: (factor: FactorId, state: StateId, value: number) => void;
  setWeight: (dim: ValueDimensionId, value: number) => void;
  setEvaluator: (id: string) => void;
  setPin: (factor: FactorId, state: StateId | null) => void;
  applyPreset: (id: string) => void;
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
    credences: structuredClone(preset.credences),
    weights: preset.weights ? { ...preset.weights } : { ...dataset.defaultWeights },
  };
}

function baselineState() {
  return {
    credences: structuredClone(dataset.baselineCredences),
    weights: { ...dataset.defaultWeights },
    evaluatorId: 'cached',
    pins: {} as Pins,
    activePresetId: null as string | null,
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
    set({ activePresetId: id, ...presetCredencesWeights(id) });
  },

  reset: () => {
    writeUrlPresetId(null);
    set(baselineState());
  },
}));
