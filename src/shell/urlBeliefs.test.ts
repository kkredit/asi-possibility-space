import { describe, expect, it } from 'vitest';
import { dataset } from '@model/dataset';
import { deriveCredences } from '@engine/derive';
import { decodeBeliefs, encodeBeliefs, type SharedBeliefs } from '@shell/urlBeliefs';

const sample = (): SharedBeliefs => ({
  credences: deriveCredences(dataset, structuredClone(dataset.baselineCredences), dataset.subBaseline!),
  subCredences: structuredClone(dataset.subBaseline!),
  weights: { survival: 0.4, agency: 0.15, suffering: 0.3, flourishing: 0.15 },
  probabilityModel: 'bayesNet',
  alignmentMode: 'derived',
});

describe('shareable belief links', () => {
  it('round-trips every distribution within quantization (±0.001)', () => {
    const b = sample();
    // Make it a genuinely custom set, including 3-decimal extremes.
    b.credences.orthogonality = { holds: 0.998, fails: 0.002 };
    b.credences.takeoff = { fast: 0.07, medium: 0.61, slow: 0.32 };
    b.subCredences.corrigibility = { broadBasin: 0.61, narrow: 0.27, antiNatural: 0.12 };
    const out = decodeBeliefs(encodeBeliefs(b))!;
    expect(out).not.toBeNull();
    for (const fid of Object.keys(b.credences)) {
      for (const st of Object.keys(b.credences[fid])) {
        expect(out.credences[fid][st]).toBeCloseTo(b.credences[fid][st], 2.5);
        expect(Math.abs(out.credences[fid][st] - b.credences[fid][st])).toBeLessThanOrEqual(0.0011);
      }
      const sum = Object.values(out.credences[fid]).reduce((a, v) => a + v, 0);
      expect(sum).toBeCloseTo(1, 9);
    }
    for (const sid of Object.keys(b.subCredences)) {
      const sum = Object.values(out.subCredences[sid]).reduce((a, v) => a + v, 0);
      expect(sum).toBeCloseTo(1, 9);
      for (const st of Object.keys(b.subCredences[sid])) {
        expect(Math.abs(out.subCredences[sid][st] - b.subCredences[sid][st])).toBeLessThanOrEqual(0.0011);
      }
    }
    for (const dim of ['survival', 'agency', 'suffering', 'flourishing'] as const) {
      expect(Math.abs(out.weights[dim] - b.weights[dim])).toBeLessThanOrEqual(0.0011);
    }
    expect(out.probabilityModel).toBe('bayesNet');
    expect(out.alignmentMode).toBe('derived');
  });

  it('flags round-trip independently', () => {
    const b = { ...sample(), probabilityModel: 'independence' as const, alignmentMode: 'direct' as const };
    const out = decodeBeliefs(encodeBeliefs(b))!;
    expect(out.probabilityModel).toBe('independence');
    expect(out.alignmentMode).toBe('direct');
  });

  it('emits URL-safe output (no padding, no + or /)', () => {
    const encoded = encodeBeliefs(sample());
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded.length).toBeLessThan(120); // stays comfortably shareable
  });

  it('rejects garbage, truncation, and schema-mismatched payloads', () => {
    const encoded = encodeBeliefs(sample());
    expect(decodeBeliefs('not!valid@base64')).toBeNull();
    expect(decodeBeliefs(encoded.slice(0, 10))).toBeNull(); // wrong length
    expect(decodeBeliefs('')).toBeNull();
    // Different version byte
    const bytes = encoded.replace(/^./, 'Z');
    expect(decodeBeliefs(bytes)).toBeNull();
  });
});
