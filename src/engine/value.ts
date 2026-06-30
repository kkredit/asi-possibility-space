import type { ValueDimensionId, ValueVector } from '@model/types';

export const VALUE_DIMENSION_IDS: ValueDimensionId[] = [
  'survival',
  'agency',
  'suffering',
  'flourishing',
];

export function clamp(x: number, lo = -1, hi = 1): number {
  return Math.max(lo, Math.min(hi, x));
}

export function addVectors(a: ValueVector, b: Partial<ValueVector>): ValueVector {
  const out = { ...a };
  for (const id of VALUE_DIMENSION_IDS) {
    if (b[id] !== undefined) out[id] += b[id] as number;
  }
  return out;
}

export function clampVector(v: ValueVector): ValueVector {
  return {
    survival: clamp(v.survival),
    agency: clamp(v.agency),
    suffering: clamp(v.suffering),
    flourishing: clamp(v.flourishing),
  };
}

/**
 * Collapse a value vector to a single scalar using (normalized) weights.
 * Result is in [-1, 1] regardless of the raw weight magnitudes.
 */
export function scalarize(value: ValueVector, weights: ValueVector): number {
  let weightSum = 0;
  for (const id of VALUE_DIMENSION_IDS) weightSum += Math.abs(weights[id]);
  if (weightSum === 0) return 0;
  let acc = 0;
  for (const id of VALUE_DIMENSION_IDS) acc += weights[id] * value[id];
  return acc / weightSum;
}
