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

function defaults() {
  return {
    credences: structuredClone(dataset.baselineCredences),
    weights: { ...dataset.defaultWeights },
    evaluatorId: 'cached',
    pins: {} as Pins,
    activePresetId: null as string | null,
  };
}

export const useBeliefs = create<BeliefState>((set) => ({
  ...defaults(),

  // Manual credence/weight edits mean the beliefs no longer match a preset.
  setCredence: (factor, state, value) =>
    set((s) => ({
      activePresetId: null,
      credences: {
        ...s.credences,
        [factor]: setStateProbability(s.credences[factor], state, value),
      },
    })),

  setWeight: (dim, value) =>
    set((s) => ({ activePresetId: null, weights: { ...s.weights, [dim]: Math.max(0, value) } })),

  setEvaluator: (id) => set({ evaluatorId: id }),

  setPin: (factor, state) =>
    set((s) => {
      const pins = { ...s.pins };
      if (state === null) delete pins[factor];
      else pins[factor] = state;
      return { pins };
    }),

  applyPreset: (id) =>
    set(() => {
      const preset = presets.find((p) => p.id === id);
      if (!preset) return {};
      return {
        activePresetId: id,
        credences: structuredClone(preset.credences),
        weights: preset.weights ? { ...preset.weights } : { ...dataset.defaultWeights },
      };
    }),

  reset: () => set(defaults()),
}));
