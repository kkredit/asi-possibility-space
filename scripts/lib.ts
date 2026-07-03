/**
 * Shared helpers for the doc-mining scripts (mine-findings, research-roi,
 * action-conditions, power-probe). Everything here reads the independence ×
 * couplings probability model and the cached (hand-reasoned) value surface —
 * the same conventions the scripts document in their headers.
 */
import { writeFileSync } from 'node:fs';
import { analyze, cachedEvaluator } from '@engine/index';
import type { Pins } from '@engine/index';
import { dataset } from '@model/dataset';
import type { Credences, Scenario, ValueVector } from '@model/types';

export const base = dataset.baselineCredences;
export const W = dataset.defaultWeights;
export const ev = cachedEvaluator;

// ── formatters ──────────────────────────────────────────────────────────────
/** Signed, 3-decimal EV-delta formatter (unicode minus). */
export const sev = (x: number): string => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(3)}`;
export const pct = (x: number, digits = 0): string => `${(x * 100).toFixed(digits)}%`;

// ── label lookups ───────────────────────────────────────────────────────────
export const actionLabel = (id: string): string => dataset.actions.find((a) => a.id === id)?.label ?? id;
export const factorLabel = (fid: string): string => dataset.factors.find((f) => f.id === fid)?.label ?? fid;
export const stateLabel = (fid: string, sid: string): string =>
  dataset.factors.find((f) => f.id === fid)?.states.find((s) => s.id === sid)?.label ?? sid;

// ── shared analysis primitives ──────────────────────────────────────────────
/** Normalized conditional-mean EV over the free factors given `pins` (not mass-weighted). */
export function condMean(credences: Credences, pins: Pins, weights: ValueVector = W): number {
  const a = analyze(dataset, credences, weights, ev, pins);
  return a.totalProbability > 0 ? a.ev / a.totalProbability : 0;
}

/** concentrated − diffuse conditional-mean EV under `weights` and an extra condition. */
export function powerGap(cond: Pins, weights: ValueVector): number {
  return (
    condMean(base, { ...cond, powerConcentration: 'concentrated' }, weights) -
    condMean(base, { ...cond, powerConcentration: 'diffuse' }, weights)
  );
}

/**
 * The objective-world distribution (the "conditions" space): for every joint
 * assignment of the objective factors, its probability mass under the coupled
 * joint and the pins that select it.
 */
export function objectiveWorlds(): {
  worlds: string[];
  worldProb: Record<string, number>;
  worldPins: Record<string, Pins>;
} {
  const objIds = dataset.factors.filter((f) => f.kind === 'objective').map((f) => f.id);
  const scenarios = analyze(dataset, base, W, ev).scenarios;
  const wKey = (s: Scenario) => objIds.map((id) => s[id]).join('|');
  const worldProb: Record<string, number> = {};
  const worldPins: Record<string, Pins> = {};
  for (const sc of scenarios) {
    const k = wKey(sc.scenario);
    worldProb[k] = (worldProb[k] ?? 0) + sc.probability;
    if (!worldPins[k]) worldPins[k] = Object.fromEntries(objIds.map((id) => [id, sc.scenario[id]])) as Pins;
  }
  return { worlds: Object.keys(worldProb), worldProb, worldPins };
}

// ── markdown accumulator ────────────────────────────────────────────────────
/** Line accumulator: `P()` appends, `save(path)` writes and logs. */
export function docLines(): { P: (s?: string) => void; save: (path: string) => void } {
  const lines: string[] = [];
  return {
    P: (s = '') => lines.push(s),
    save(path: string) {
      writeFileSync(path, lines.join('\n') + '\n', 'utf8');
      // eslint-disable-next-line no-console
      console.log(`\nWrote ${lines.length} lines to ${path}\n`);
    },
  };
}
