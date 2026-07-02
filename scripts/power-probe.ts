/**
 * Probe: does power concentration matter *conditionally* (slow takeoff / governance /
 * a survivable world), even though its marginal tornado swing is ~0? Prints a table
 * of the normalized conditional-mean EV under power=concentrated vs diffuse, across
 * conditions and weight profiles.
 *
 *   pnpm exec vitest run --config scripts/probe.config.ts
 */
import { test } from 'vitest';
import { dataset } from '@model/dataset';
import { analyze, cachedEvaluator } from '@engine/index';
import type { Pins } from '@engine/scenarios';
import type { ValueVector } from '@model/types';

const base = dataset.baselineCredences;
const ev = cachedEvaluator;
const W = dataset.defaultWeights;
const agency: ValueVector = { survival: 0, agency: 1, suffering: 0, flourishing: 0 };

/** Normalized conditional-mean EV (not mass-weighted): ev / totalProbability. */
function condEV(pins: Pins, w: ValueVector): number {
  const a = analyze(dataset, base, w, ev, pins);
  return a.totalProbability > 0 ? a.ev / a.totalProbability : 0;
}

/** concentrated − diffuse, conditional-mean, under weights w and extra condition. */
function powerGap(cond: Pins, w: ValueVector): number {
  return condEV({ ...cond, powerConcentration: 'concentrated' }, w) - condEV({ ...cond, powerConcentration: 'diffuse' }, w);
}

const conditions: { name: string; pins: Pins }[] = [
  { name: 'marginal (no condition)', pins: {} },
  { name: 'takeoff = slow', pins: { takeoff: 'slow' } },
  { name: 'takeoff = fast', pins: { takeoff: 'fast' } },
  { name: 'coordination = regime', pins: { coordination: 'regime' } },
  { name: 'orthogonality = fails (benign)', pins: { orthogonality: 'fails' } },
  { name: 'alignmentInTime = yes (we survive)', pins: { alignmentInTime: 'yes' } },
  { name: 'doom corner (holds, no align, no ctrl)', pins: { orthogonality: 'holds', alignmentInTime: 'no', controlDeployed: 'no' } },
  { name: 'benign & slow', pins: { orthogonality: 'fails', takeoff: 'slow' } },
  { name: 'we-win world: aligned & slow & regime', pins: { alignmentInTime: 'yes', takeoff: 'slow', coordination: 'regime' } },
];

const fmt = (x: number) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(3)}`;

test('power concentration conditional gap', () => {
  const rows: string[] = [];
  rows.push('condition                                    | Δ(conc−diff) default W | Δ agency-only');
  rows.push('---------------------------------------------|------------------------|--------------');
  for (const c of conditions) {
    const gDefault = powerGap(c.pins, W);
    const gAgency = powerGap(c.pins, agency);
    rows.push(`${c.name.padEnd(44)} | ${fmt(gDefault).padStart(22)} | ${fmt(gAgency)}`);
  }
  // eslint-disable-next-line no-console
  console.log('\nPositive = concentrated scores HIGHER; negative = diffuse higher.\n' + rows.join('\n') + '\n');
});
