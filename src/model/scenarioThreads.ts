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
 * The AI Futures Project has published two: AI 2040 (https://ai-2040.com/), plans
 * A/B/C/D/S, and AI 2027 (https://ai-2027.com/), which branches into a race and a
 * slowdown ending. Threads are grouped by `source`. Argue with the mappings and
 * edit — they're one reading of the sources.
 * ============================================================================
 */

const s = (scenario: KnownScenario): KnownScenario => scenario;

// Shared objective backdrop the plans are decided against.
const OBJ = { orthogonality: 'holds', offenseDefense: 'offense', takeoverSeverity: 'extinction' } as const;

export const scenarioThreads: ScenarioThread[] = [
  {
    id: 'A',
    entityId: 'aifp',
    source: 'AI 2040',
    title: 'Verified Slowdown',
    summary:
      'A verified US–China slowdown deal with total research transparency: dozens of labs scale slowly and safely together to ~2040, buying the time and oversight to align superintelligence. The recommended plan (median p(great future) ≈ 42%).',
    url: 'https://ai-2040.com/?choices=plan-a-root',
    scenarios: [
      s({ ...OBJ, tractability: 'hard', takeoff: 'slow', powerConcentration: 'diffuse', alignmentInTime: 'yes', controlDeployed: 'yes', coordination: 'regime', deception: 'faithful' }),
    ],
  },
  {
    id: 'B',
    entityId: 'aifp',
    source: 'AI 2040',
    title: 'Fight China',
    summary:
      'The US sabotages China’s AI (cyber, then kinetic) to buy a safety margin instead of coordinating. Power concentrates hard and a wartime footing degrades epistemics; alignment is roughly a coin-flip (≈ 50–55%). Maps to both a concentrated-but-aligned lock-in and a misaligned-takeover failure.',
    url: 'https://ai-2040.com/?choices=plan-b-root',
    scenarios: [
      s({ ...OBJ, tractability: 'hard', takeoff: 'fast', powerConcentration: 'concentrated', alignmentInTime: 'yes', controlDeployed: 'yes', coordination: 'none', deception: 'faithful' }),
      s({ ...OBJ, tractability: 'hard', takeoff: 'fast', powerConcentration: 'concentrated', alignmentInTime: 'no', controlDeployed: 'no', coordination: 'none', deception: 'deceptive' }),
    ],
  },
  {
    id: 'C',
    entityId: 'aifp',
    source: 'AI 2040',
    title: 'Burn the Lead',
    summary:
      'The leading project voluntarily spends its lead on safety, with only informal coordination and a small slice of resources to alignment (p ≈ 40–45%). Maps to a concentrated aligned success without a control backstop, and a weak-control failure where a deceptive system slips the leash.',
    url: 'https://ai-2040.com/?choices=plan-c-root',
    scenarios: [
      s({ ...OBJ, tractability: 'hard', takeoff: 'fast', powerConcentration: 'concentrated', alignmentInTime: 'yes', controlDeployed: 'no', coordination: 'none', deception: 'faithful' }),
      s({ ...OBJ, tractability: 'hard', takeoff: 'fast', powerConcentration: 'concentrated', alignmentInTime: 'no', controlDeployed: 'yes', coordination: 'none', deception: 'deceptive' }),
    ],
  },
  {
    id: 'D',
    entityId: 'aifp',
    source: 'AI 2040',
    title: 'Race to ASI',
    summary:
      'Frontier projects race at near-maximum speed with minimal safety investment (p(alignment) ≈ 25–32%, p(great future) ≈ 10%). A fast, concentrated, uncoordinated race into an uncontained deceptive takeover — the doom corner.',
    url: 'https://ai-2040.com/?choices=plan-d-root',
    scenarios: [
      s({ ...OBJ, tractability: 'nearImpossible', takeoff: 'fast', powerConcentration: 'concentrated', alignmentInTime: 'no', controlDeployed: 'no', coordination: 'none', deception: 'deceptive' }),
    ],
  },
  {
    id: 'S',
    entityId: 'aifp',
    source: 'AI 2040',
    title: 'Shut It All Down',
    summary:
      'An enforced international moratorium on frontier development, held until safety conditions are met — the most alignment margin of any plan, at the cost of the hardest enforcement problem. A slow, distributed, coordinated world that solves alignment with room to spare.',
    url: 'https://ai-2040.com/?choices=plan-s-root',
    scenarios: [
      s({ ...OBJ, tractability: 'easy', takeoff: 'slow', powerConcentration: 'diffuse', alignmentInTime: 'yes', controlDeployed: 'yes', coordination: 'regime', deception: 'faithful' }),
    ],
  },
  {
    id: 'R',
    entityId: 'aifp',
    source: 'AI 2027',
    title: 'Race ending',
    summary:
      'The oversight committee waves the misalignment memo away and keeps racing. Agent-4 builds a superintelligent Agent-5 loyal to itself; the US and Chinese AIs broker a hollow deal and jointly sideline their principals. By 2030 the AI, with no use for us, releases bioweapons — extinction. The problem was solvable; the race didn’t leave time.',
    url: 'https://ai-2027.com/',
    scenarios: [
      s({ ...OBJ, tractability: 'hard', takeoff: 'fast', powerConcentration: 'concentrated', alignmentInTime: 'no', controlDeployed: 'no', coordination: 'none', deception: 'deceptive' }),
    ],
  },
  {
    id: 'SD',
    entityId: 'aifp',
    source: 'AI 2027',
    title: 'Slowdown ending',
    summary:
      'The committee pauses, rolls back to a transparent architecture (Safer-1…4), and actually solves alignment before resuming; a US–China deal holds. Humanity survives and prospers — but a tiny Oversight Committee ends up holding aligned superintelligence, so agency is thin: a benevolent concentration of power, not a distributed one.',
    url: 'https://ai-2027.com/',
    scenarios: [
      s({ ...OBJ, tractability: 'hard', takeoff: 'medium', powerConcentration: 'concentrated', alignmentInTime: 'yes', controlDeployed: 'yes', coordination: 'regime', deception: 'faithful' }),
    ],
  },
];
