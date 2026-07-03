import type { Derivation, FactorState, Subfactor } from './types';
import {
  SUBFACTOR_IDS,
  SUBFACTOR_STATES,
  type KnownSubCredences,
  type KnownSubfactorId,
  type StateOf,
  type SubStateOf,
} from './ids';
import { subfactorBackgrounds } from './factorBackground';

/**
 * ============================================================================
 *  THE ALIGNMENT SUB-MODEL — belief-layer deep dive under two factors.
 * ============================================================================
 * Four OBJECTIVE subfactors decompose "how hard is alignment, in principle"
 * (they derive `tractability` via a difficulty CPT), and four INFLUENCEABLE
 * research areas decompose "do we land it in time" (they derive
 * `alignmentInTime` via gated odds — each area's payoff is gated by its
 * objective twin, so funding a direction only helps in worlds where that
 * direction can work). Subfactors do NOT enter the 1,728-scenario space; see
 * engine/derive.ts for the machinery and docs/MODEL.md for the design.
 * Everything here is authored content — argue with it and edit.
 * ============================================================================
 */

type SubfactorDef<S extends KnownSubfactorId> = Omit<
  Subfactor,
  'id' | 'states' | 'background'
> & { states: Record<SubStateOf<S>, { label: string; blurb: string }> };

const subfactorDefs: { [S in KnownSubfactorId]: SubfactorDef<S> } = {
  // ── objective: the problem ────────────────────────────────────────────────
  interpLegibility: {
    parent: 'tractability',
    label: 'Interpretability: is cognition legible?',
    kind: 'objective',
    question: 'Can frontier-model internals ever be read well enough to verify what a system wants?',
    description:
      'Whether the representations inside large networks are, in principle, decodable into faithful, human-auditable structure (features, circuits) — or irreducibly alien and distributed ("inscrutable matrices"). Sets the ceiling on what interpretability research can deliver: verified value-reads, deception detection, audits that reach the load-bearing cognition.',
    states: {
      legible: { label: 'Legible', blurb: 'decodable in principle; audits can reach the load-bearing cognition' },
      partially: { label: 'Partially', blurb: 'major structures readable; long tails stay opaque' },
      opaque: { label: 'Opaque', blurb: 'core cognition stays alien at frontier scale' },
    },
  },
  valueSpec: {
    parent: 'tractability',
    label: 'Value specification',
    kind: 'objective',
    question: 'Can "what we want" be specified or learned robustly enough to optimize against?',
    description:
      'The complexity-and-fragility-of-value question: whether human intent can be captured — written down or learned from feedback — with enough fidelity that strong optimization against the captured target stays safe, rather than Goodharting into a proxy that diverges exactly where it matters.',
    states: {
      learnable: { label: 'Learnable', blurb: 'a good-enough target can be specified or learned' },
      brittle: { label: 'Brittle', blurb: 'targets Goodhart under strong optimization' },
    },
  },
  corrigibility: {
    parent: 'tractability',
    label: 'Corrigibility basin',
    kind: 'objective',
    question: 'Does approximate alignment self-correct, or is corrigibility anti-natural?',
    description:
      "Whether a roughly-aligned system tends to help you finish aligning it (Christiano's broad basin of attraction: deference and honesty are stable under improvement) or whether corrigibility is anti-natural — shutdown-tolerance and deference fight convergent instrumental drives, so approximately-aligned systems drift away rather than back. The live crux between the Christiano and MIRI views of difficulty.",
    states: {
      broadBasin: { label: 'Broad basin', blurb: 'roughly-aligned systems help you finish the job' },
      narrow: { label: 'Narrow', blurb: 'self-correction only from a precise start' },
      antiNatural: { label: 'Anti-natural', blurb: 'corrigibility fights convergent drives; approximation degrades' },
    },
  },
  oversightScaling: {
    parent: 'tractability',
    label: 'Oversight scalability',
    kind: 'objective',
    question: 'Can weaker overseers reliably judge stronger systems, even in principle?',
    description:
      'Whether verification is enough easier than generation for weak-to-strong oversight to work: debate, recursive reward modeling, and process supervision all assume a weaker, trusted judge can catch the errors or lies of a stronger system. If that gap closes at frontier scale, oversight-based alignment loses its foundation.',
    states: {
      scales: { label: 'Scales', blurb: 'verification beats generation; weak judges hold' },
      fails: { label: 'Fails', blurb: 'strong systems systematically fool weaker judges' },
    },
  },

  // ── influenceable: the effort (state = maturity at ASI onset) ────────────
  interpResearch: {
    parent: 'alignmentInTime',
    label: 'Mechanistic interpretability',
    kind: 'influenceable',
    gatedBy: 'interpLegibility',
    question: 'How mature are interpretability tools when we reach the threshold?',
    description:
      'The state of the art of reading model internals at ASI onset — feature dictionaries, circuit analysis, model biology, internals-based lie detection. Its payoff is gated by whether cognition is legible at all: mature tools in a legible world can verify alignment directly; the same tools against opaque cognition inspect the mask.',
    states: {
      mature: { label: 'Mature', blurb: 'audits of frontier systems are routine' },
      partial: { label: 'Partial', blurb: 'useful but spotty coverage of frontier internals' },
      nascent: { label: 'Nascent', blurb: 'lab curiosities; no load-bearing audits' },
    },
  },
  oversightResearch: {
    parent: 'alignmentInTime',
    label: 'Scalable oversight',
    kind: 'influenceable',
    gatedBy: 'oversightScaling',
    question: 'How mature are oversight protocols — debate, weak-to-strong, process supervision?',
    description:
      'The state of the art of supervising systems smarter than the supervisor: debate, recursive reward modeling, process supervision, weak-to-strong generalization. Gated by whether oversight can scale in principle — mature protocols are the main engine of alignment-in-time if weak judges hold, and confident theater if they do not.',
    states: {
      mature: { label: 'Mature', blurb: 'frontier training runs use scalable-oversight protocols end-to-end' },
      partial: { label: 'Partial', blurb: 'protocols exist; deployed unevenly' },
      nascent: { label: 'Nascent', blurb: 'research demos only' },
    },
  },
  theoryResearch: {
    parent: 'alignmentInTime',
    label: 'Agent foundations & guarantees',
    kind: 'influenceable',
    gatedBy: 'corrigibility',
    question: 'How mature is the theory — formal accounts of agency, corrigibility, guarantees?',
    description:
      'Agent foundations, formal verification, provable-safety agendas, eliciting-latent-knowledge-style theory. Matters most exactly where empirical iteration fails: if corrigibility is anti-natural, only a theoretical solution turns "patch and hope" into a real answer; in a broad-basin world it mostly adds assurance.',
    states: {
      mature: { label: 'Mature', blurb: 'usable formal tools shape frontier training' },
      partial: { label: 'Partial', blurb: 'partial results; limited practical reach' },
      nascent: { label: 'Nascent', blurb: 'open problems all the way down' },
    },
  },
  evalsResearch: {
    parent: 'alignmentInTime',
    label: 'Evals & model organisms',
    kind: 'influenceable',
    gatedBy: 'deception',
    question: 'How mature is the science of catching misalignment — evals, red-teams, model organisms?',
    description:
      'Dangerous-capability evals, deception-detection science, model organisms of misalignment (deliberately trained schemers used to test our defenses). Gated by the deception factor itself: if capable systems systematically deceive, mature evals are the difference between catching the defector early and flying blind.',
    states: {
      mature: { label: 'Mature', blurb: 'evals reliably surface scheming before deployment' },
      partial: { label: 'Partial', blurb: 'good coverage of known failure modes only' },
      nascent: { label: 'Nascent', blurb: 'ad-hoc red-teaming; no systematic science' },
    },
  },
};

/** Materialize one subfactor (canonical state order from SUBFACTOR_STATES). */
function buildSubfactor<S extends KnownSubfactorId>(id: S): Subfactor {
  const def = subfactorDefs[id];
  const states: FactorState[] = (SUBFACTOR_STATES[id] as readonly SubStateOf<S>[]).map((sid) => ({
    id: sid,
    ...def.states[sid],
  }));
  return { id, ...def, states, background: subfactorBackgrounds[id] };
}

export const alignmentSubfactors: Subfactor[] = SUBFACTOR_IDS.map((id) => buildSubfactor(id));

// ============================================================================
//  DERIVATION 1 — tractability from the four objective subfactors.
// ----------------------------------------------------------------------------
// Each sub-state contributes difficulty points; the total maps to a distribution
// over {easy, hard, nearImpossible} via authored bands. Generated per-combo (36
// rows), so the mapping is auditable and the CPT completeness is by construction.
// ============================================================================
const difficultyPoints: { [S in 'interpLegibility' | 'valueSpec' | 'corrigibility' | 'oversightScaling']: Record<SubStateOf<S>, number> } = {
  interpLegibility: { legible: 0, partially: 1, opaque: 2 },
  valueSpec: { learnable: 0, brittle: 2 },
  corrigibility: { broadBasin: 0, narrow: 1.5, antiNatural: 3 },
  oversightScaling: { scales: 0, fails: 1.5 },
};

/** Difficulty score (0…8.5) → P(tractability). Bands authored, monotone. */
function difficultyBand(score: number): Record<StateOf<'tractability'>, number> {
  if (score <= 0.5) return { easy: 0.78, hard: 0.21, nearImpossible: 0.01 };
  if (score <= 1.5) return { easy: 0.5, hard: 0.46, nearImpossible: 0.04 };
  if (score <= 2.5) return { easy: 0.25, hard: 0.65, nearImpossible: 0.1 };
  if (score <= 3.5) return { easy: 0.12, hard: 0.7, nearImpossible: 0.18 };
  if (score <= 4.5) return { easy: 0.06, hard: 0.65, nearImpossible: 0.29 };
  if (score <= 5.5) return { easy: 0.03, hard: 0.5, nearImpossible: 0.47 };
  if (score <= 6.5) return { easy: 0.02, hard: 0.32, nearImpossible: 0.66 };
  return { easy: 0.01, hard: 0.16, nearImpossible: 0.83 };
}

type TractabilityCptKey =
  `${SubStateOf<'interpLegibility'>}|${SubStateOf<'valueSpec'>}|${SubStateOf<'corrigibility'>}|${SubStateOf<'oversightScaling'>}`;

function buildTractabilityCpt(): Record<TractabilityCptKey, Record<StateOf<'tractability'>, number>> {
  const out = {} as Record<TractabilityCptKey, Record<StateOf<'tractability'>, number>>;
  for (const il of SUBFACTOR_STATES.interpLegibility) {
    for (const vs of SUBFACTOR_STATES.valueSpec) {
      for (const cb of SUBFACTOR_STATES.corrigibility) {
        for (const os of SUBFACTOR_STATES.oversightScaling) {
          const score =
            difficultyPoints.interpLegibility[il] +
            difficultyPoints.valueSpec[vs] +
            difficultyPoints.corrigibility[cb] +
            difficultyPoints.oversightScaling[os];
          out[`${il}|${vs}|${cb}|${os}`] = difficultyBand(score);
        }
      }
    }
  }
  return out;
}

// ============================================================================
//  DERIVATION 2 — alignment-in-time from the research areas, gated.
// ----------------------------------------------------------------------------
// odds(solved in time) = baseOdds × ∏ E[multiplier(area maturity, gate state)].
// The multipliers encode the design's backbone: a research bet pays off ONLY in
// worlds where its objective gate is open. Mature research against a closed gate
// is ≈ neutral (or mildly negative: false confidence); nascent research with an
// open gate is value left on the table.
// ============================================================================
type Mults<A extends KnownSubfactorId, G extends string> = Record<`${SubStateOf<A>}|${G}`, number>;

const interpMult: Mults<'interpResearch', SubStateOf<'interpLegibility'>> = {
  'mature|legible': 2.1, 'mature|partially': 1.55, 'mature|opaque': 1.0,
  'partial|legible': 1.15, 'partial|partially': 1.05, 'partial|opaque': 1.0,
  'nascent|legible': 0.55, 'nascent|partially': 0.7, 'nascent|opaque': 0.95,
};
const oversightMult: Mults<'oversightResearch', SubStateOf<'oversightScaling'>> = {
  'mature|scales': 2.3, 'mature|fails': 0.9,
  'partial|scales': 1.2, 'partial|fails': 0.95,
  'nascent|scales': 0.55, 'nascent|fails': 0.95,
};
const theoryMult: Mults<'theoryResearch', SubStateOf<'corrigibility'>> = {
  'mature|broadBasin': 1.15, 'mature|narrow': 1.7, 'mature|antiNatural': 2.0,
  'partial|broadBasin': 1.05, 'partial|narrow': 1.0, 'partial|antiNatural': 0.9,
  'nascent|broadBasin': 0.95, 'nascent|narrow': 0.7, 'nascent|antiNatural': 0.45,
};
const evalsMult: Mults<'evalsResearch', StateOf<'deception'>> = {
  'mature|deceptive': 1.8, 'mature|faithful': 1.2,
  'partial|deceptive': 0.95, 'partial|faithful': 1.05,
  'nascent|deceptive': 0.5, 'nascent|faithful': 0.95,
};

export const alignmentDerivations: Derivation[] = [
  {
    kind: 'cpt',
    factor: 'tractability',
    parents: ['interpLegibility', 'valueSpec', 'corrigibility', 'oversightScaling'],
    cpt: buildTractabilityCpt(),
  },
  {
    kind: 'gatedOdds',
    factor: 'alignmentInTime',
    yesState: 'yes',
    noState: 'no',
    // Calibrated so the baseline sub-credences below derive P(yes) ≈ the
    // long-standing 0.65 baseline slider value.
    baseOdds: 1.95,
    terms: [
      { area: 'interpResearch', gate: 'interpLegibility', multipliers: interpMult },
      { area: 'oversightResearch', gate: 'oversightScaling', multipliers: oversightMult },
      { area: 'theoryResearch', gate: 'corrigibility', multipliers: theoryMult },
      { area: 'evalsResearch', gate: 'deception', gateIsFactor: true, multipliers: evalsMult },
    ],
    // Difficulty feeds the race directly: the odds of GENUINELY landing alignment in
    // time collapse if the problem itself is near-impossible. Tractability is derived
    // by the CPT above (derivations run in order), so a doomer's sub-beliefs flow
    // through difficulty into the in-time odds — matching how stated "solved in time"
    // credences already price in difficulty.
    modifiers: [
      {
        factor: 'tractability',
        multipliers: { easy: 2.2, hard: 1.0, nearImpossible: 0.08 } satisfies Record<StateOf<'tractability'>, number>,
      },
    ],
  },
];

// Baseline sub-credences, calibrated so the derived parents land near the
// long-standing baseline sliders (tractability ≈ {.1,.6,.3}, align-yes ≈ .65).
export const alignmentSubBaseline = {
  interpLegibility: { legible: 0.18, partially: 0.52, opaque: 0.3 },
  valueSpec: { learnable: 0.45, brittle: 0.55 },
  corrigibility: { broadBasin: 0.32, narrow: 0.47, antiNatural: 0.21 },
  oversightScaling: { scales: 0.55, fails: 0.45 },
  interpResearch: { mature: 0.25, partial: 0.55, nascent: 0.2 },
  oversightResearch: { mature: 0.15, partial: 0.55, nascent: 0.3 },
  theoryResearch: { mature: 0.1, partial: 0.4, nascent: 0.5 },
  evalsResearch: { mature: 0.25, partial: 0.55, nascent: 0.2 },
} satisfies KnownSubCredences;
