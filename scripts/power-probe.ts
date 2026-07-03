/**
 * Probe: does power concentration matter *conditionally* (slow takeoff / governance /
 * a survivable world), even though its marginal tornado swing is ~0? Prints a table
 * of the normalized conditional-mean EV under power=concentrated vs diffuse, across
 * conditions and weight profiles.
 *
 *   pnpm exec vitest run --config scripts/probe.config.ts
 */
import { test } from 'vitest';
import type { Pins } from '@engine/index';
import type { ValueVector } from '@model/types';
import { powerGap, sev, W } from './lib';

const agency: ValueVector = { survival: 0, agency: 1, suffering: 0, flourishing: 0 };

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


test('power concentration conditional gap', () => {
  const rows: string[] = [];
  rows.push('condition                                    | Δ(conc−diff) default W | Δ agency-only');
  rows.push('---------------------------------------------|------------------------|--------------');
  for (const c of conditions) {
    const gDefault = powerGap(c.pins, W);
    const gAgency = powerGap(c.pins, agency);
    rows.push(`${c.name.padEnd(44)} | ${sev(gDefault).padStart(22)} | ${sev(gAgency)}`);
  }
  // eslint-disable-next-line no-console
  console.log('\nPositive = concentrated scores HIGHER; negative = diffuse higher.\n' + rows.join('\n') + '\n');
});
