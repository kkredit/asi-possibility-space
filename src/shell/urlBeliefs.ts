import { FACTOR_IDS, FACTOR_STATES, SUBFACTOR_IDS, SUBFACTOR_STATES } from '@model/ids';
import type { Credences, SubCredences, ValueVector } from '@model/types';
import { VALUE_DIMENSION_IDS } from '@engine/value';

/**
 * Compact shareable encoding of a full custom belief set for the URL hash
 * (`#beliefs=<base64url>`). Layout (canonical ids.ts order, so it needs no keys):
 *
 *   byte 0      version
 *   byte 1      flags: bit0 = probabilityModel is bayesNet, bit1 = alignmentMode is derived
 *   then uint16 (big-endian) per value, ×1000 quantized:
 *     per factor: its first |states|−1 probabilities (last is 1 − Σ others)
 *     per subfactor: same
 *     the four value-dimension weights
 *
 * ~60 bytes → ~84 base64url chars. A link minted against a different factor
 * schema fails the version/length check and is ignored gracefully.
 */
export interface SharedBeliefs {
  credences: Credences;
  subCredences: SubCredences;
  weights: ValueVector;
  probabilityModel: 'independence' | 'bayesNet';
  alignmentMode: 'derived' | 'direct';
}

const VERSION = 1;

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_INDEX = new Map([...B64].map((ch, i) => [ch, i]));

function toBase64url(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b === undefined) break;
    out += B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c === undefined) break;
    out += B64[c & 63];
  }
  return out;
}

function fromBase64url(s: string): number[] | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of s) {
    const v = B64_INDEX.get(ch);
    if (v === undefined) return null;
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 255);
    }
  }
  return bytes;
}

/** The canonical (group, id, dropped-state-count) layout both directions share. */
function layout(): { kind: 'factor' | 'subfactor'; id: string; states: readonly string[] }[] {
  return [
    ...FACTOR_IDS.map((id) => ({ kind: 'factor' as const, id, states: FACTOR_STATES[id] })),
    ...SUBFACTOR_IDS.map((id) => ({ kind: 'subfactor' as const, id, states: SUBFACTOR_STATES[id] })),
  ];
}

export function encodeBeliefs(b: SharedBeliefs): string {
  const values: number[] = [];
  for (const entry of layout()) {
    const dist = (entry.kind === 'factor' ? b.credences : b.subCredences)[entry.id] ?? {};
    for (const st of entry.states.slice(0, -1)) values.push(dist[st] ?? 0);
  }
  for (const dim of VALUE_DIMENSION_IDS) values.push(b.weights[dim] ?? 0);

  const bytes: number[] = [
    VERSION,
    (b.probabilityModel === 'bayesNet' ? 1 : 0) | (b.alignmentMode === 'derived' ? 2 : 0),
  ];
  for (const v of values) {
    const q = Math.max(0, Math.min(1000, Math.round(v * 1000)));
    bytes.push(q >> 8, q & 255);
  }
  return toBase64url(bytes);
}

export function decodeBeliefs(encoded: string): SharedBeliefs | null {
  const bytes = fromBase64url(encoded);
  if (!bytes || bytes.length < 2 || bytes[0] !== VERSION) return null;

  const entries = layout();
  const valueCount = entries.reduce((n, e) => n + e.states.length - 1, 0) + VALUE_DIMENSION_IDS.length;
  if (bytes.length !== 2 + valueCount * 2) return null; // minted against another schema

  const values: number[] = [];
  for (let i = 2; i < bytes.length; i += 2) {
    const q = (bytes[i] << 8) | bytes[i + 1];
    if (q > 1000) return null;
    values.push(q / 1000);
  }

  let cursor = 0;
  const credences: Credences = {};
  const subCredences: SubCredences = {};
  for (const entry of entries) {
    const dist: Record<string, number> = {};
    let sum = 0;
    for (const st of entry.states.slice(0, -1)) {
      dist[st] = values[cursor++];
      sum += dist[st];
    }
    // Last state carries the remainder; tiny quantization drift renormalizes away.
    dist[entry.states[entry.states.length - 1]] = Math.max(0, 1 - sum);
    const total = Object.values(dist).reduce((a, v) => a + v, 0);
    if (total <= 0) return null;
    for (const st of entry.states) dist[st] /= total;
    (entry.kind === 'factor' ? credences : subCredences)[entry.id] = dist;
  }
  const weights = {} as ValueVector;
  for (const dim of VALUE_DIMENSION_IDS) weights[dim] = values[cursor++];

  return {
    credences,
    subCredences,
    weights,
    probabilityModel: bytes[1] & 1 ? 'bayesNet' : 'independence',
    alignmentMode: bytes[1] & 2 ? 'derived' : 'direct',
  };
}
