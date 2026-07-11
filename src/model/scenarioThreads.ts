import type { ScenarioThread } from './types';
import type { KnownScenario } from './ids';

/**
 * ============================================================================
 *  SCENARIO THREADS — published futures mapped onto the possibility space.
 * ============================================================================
 * Each entry maps a named scenario from a public forecast onto one or more of the
 * enumerated 10-factor scenarios. A plan that only fixes the influenceable levers
 * (coordination, power, takeoff via slowdown, alignment/control) is placed against
 * this project's modal OBJECTIVE backdrop — orthogonality holds (misalignment is
 * the default, which is why the plans matter), offense-dominant conflict, and
 * takeover-as-extinction — so the branches differ on the choices, not the physics.
 * Where a source is a coin-flip on success it maps to two branches (success/fail).
 *
 * First entity: the AI Futures Project's AI 2040 (https://ai-2040.com/), plans
 * A/B/C/D/S. Argue with the mappings and edit — they're one reading of the source.
 * ============================================================================
 */

const s = (scenario: KnownScenario): KnownScenario => scenario;

// Shared objective backdrop the plans are decided against.
const OBJ = { orthogonality: 'holds', offenseDefense: 'offense', takeoverSeverity: 'extinction' } as const;

export const scenarioThreads: ScenarioThread[] = [
  {
    id: 'A',
    entityId: 'aifp',
    title: 'Verified Slowdown',
    summary:
      'A verified US–China slowdown deal with total research transparency: dozens of labs scale slowly and safely together to ~2040, buying the time and oversight to align superintelligence. The recommended plan (median p(great future) ≈ 42%).',
    url: 'https://ai-2040.com/',
    scenarios: [
      s({ ...OBJ, tractability: 'hard', takeoff: 'slow', powerConcentration: 'diffuse', alignmentInTime: 'yes', controlDeployed: 'yes', coordination: 'regime', deception: 'faithful' }),
    ],
  },
  {
    id: 'B',
    entityId: 'aifp',
    title: 'Fight China',
    summary:
      'The US sabotages China’s AI (cyber, then kinetic) to buy a safety margin instead of coordinating. Power concentrates hard and a wartime footing degrades epistemics; alignment is roughly a coin-flip (≈ 50–55%). Maps to both a concentrated-but-aligned lock-in and a misaligned-takeover failure.',
    url: 'https://ai-2040.com/supplements/comparing-possible-plans',
    scenarios: [
      s({ ...OBJ, tractability: 'hard', takeoff: 'fast', powerConcentration: 'concentrated', alignmentInTime: 'yes', controlDeployed: 'yes', coordination: 'none', deception: 'faithful' }),
      s({ ...OBJ, tractability: 'hard', takeoff: 'fast', powerConcentration: 'concentrated', alignmentInTime: 'no', controlDeployed: 'no', coordination: 'none', deception: 'deceptive' }),
    ],
  },
  {
    id: 'C',
    entityId: 'aifp',
    title: 'Burn the Lead',
    summary:
      'The leading project voluntarily spends its lead on safety, with only informal coordination and a small slice of resources to alignment (p ≈ 40–45%). Maps to a concentrated aligned success without a control backstop, and a weak-control failure where a deceptive system slips the leash.',
    url: 'https://ai-2040.com/supplements/comparing-possible-plans',
    scenarios: [
      s({ ...OBJ, tractability: 'hard', takeoff: 'fast', powerConcentration: 'concentrated', alignmentInTime: 'yes', controlDeployed: 'no', coordination: 'none', deception: 'faithful' }),
      s({ ...OBJ, tractability: 'hard', takeoff: 'fast', powerConcentration: 'concentrated', alignmentInTime: 'no', controlDeployed: 'yes', coordination: 'none', deception: 'deceptive' }),
    ],
  },
  {
    id: 'D',
    entityId: 'aifp',
    title: 'Race to ASI',
    summary:
      'Frontier projects race at near-maximum speed with minimal safety investment (p(alignment) ≈ 25–32%, p(great future) ≈ 10%). A fast, concentrated, uncoordinated race into an uncontained deceptive takeover — the doom corner.',
    url: 'https://ai-2040.com/supplements/comparing-possible-plans',
    scenarios: [
      s({ ...OBJ, tractability: 'nearImpossible', takeoff: 'fast', powerConcentration: 'concentrated', alignmentInTime: 'no', controlDeployed: 'no', coordination: 'none', deception: 'deceptive' }),
    ],
  },
  {
    id: 'S',
    entityId: 'aifp',
    title: 'Shut It All Down',
    summary:
      'An enforced international moratorium on frontier development, held until safety conditions are met — the most alignment margin of any plan, at the cost of the hardest enforcement problem. A slow, distributed, coordinated world that solves alignment with room to spare.',
    url: 'https://ai-2040.com/supplements/comparing-possible-plans',
    scenarios: [
      s({ ...OBJ, tractability: 'easy', takeoff: 'slow', powerConcentration: 'diffuse', alignmentInTime: 'yes', controlDeployed: 'yes', coordination: 'regime', deception: 'faithful' }),
    ],
  },
];
