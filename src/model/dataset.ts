import type {
  Action,
  CachedCell,
  Credences,
  Dataset,
  Factor,
  LinearContributions,
  ValueDimension,
  ValueVector,
} from './types';

/**
 * ============================================================================
 *  PRESUMED FIRST-PASS CONTENT — NOT LOCKED IN.
 * ============================================================================
 * Every number, factor, state, action, and narrative below is a starting
 * default chosen to make the POC concrete and explorable. They encode the
 * "presumed answers" to docs/DESIGN.md §5 (content) and §9 (open questions):
 *
 *  §9.1 value dimensions  -> survival / agency / suffering / flourishing, with
 *                            defaults weighted toward survival & suffering.
 *  §9.2 factor set        -> the six from §5 (kept as-is).
 *  §9.3 offense/defense   -> treated as PURELY OBJECTIVE for now (no action
 *                            attaches to it). d/acc is modeled as boosting
 *                            realized control instead.
 *  §9.4 dependencies      -> INDEPENDENCE assumed (probabilities multiply).
 *  §9.5 action cost       -> ranked by RAW EV gain (no cost term yet).
 *  §9.6 name              -> "AI Safety Possibility-Space Explorer".
 *
 * These are meant to be argued with and edited. This is the one file you change
 * to refine the model's content; the engine and UI are content-agnostic.
 * ============================================================================
 */

const valueDimensions: ValueDimension[] = [
  { id: 'survival', label: 'Survival', lowLabel: 'humanity ends', highLabel: 'humanity persists' },
  { id: 'agency', label: 'Agency', lowLabel: 'lock-in / tyranny', highLabel: 'self-determination' },
  { id: 'suffering', label: 'Suffering', lowLabel: 's-risk (astronomical)', highLabel: 'no mass suffering' },
  { id: 'flourishing', label: 'Flourishing', lowLabel: 'value squandered', highLabel: 'value realized' },
];

const factors: Factor[] = [
  {
    id: 'orthogonality',
    label: 'Orthogonality Thesis',
    kind: 'objective',
    question: 'Is misalignment the default for highly capable systems?',
    description:
      'Whether intelligence and final goals are independent. If it holds, capability does not imply benevolence and misalignment is the default. If it fails, sufficiently capable systems tend to converge toward broadly benign goals.',
    states: [
      { id: 'holds', label: 'Holds', blurb: 'goals ⟂ capability; misalignment is the default' },
      { id: 'fails', label: 'Fails', blurb: 'capable systems converge toward benevolence' },
    ],
  },
  {
    id: 'tractability',
    label: 'Alignment tractability (in principle)',
    kind: 'objective',
    question: 'How hard is it to technically align a superintelligence, at all?',
    description:
      'The intrinsic difficulty of the alignment problem, independent of whether we happen to solve it in time. A fact about the problem, not about our effort.',
    states: [
      { id: 'easy', label: 'Easy', blurb: 'tractable with modest effort' },
      { id: 'hard', label: 'Hard', blurb: 'solvable but demanding' },
      { id: 'nearImpossible', label: 'Near-impossible', blurb: 'may not be solvable in practice' },
    ],
  },
  {
    id: 'offenseDefense',
    label: 'Offense/defense balance at ASI scale',
    kind: 'objective',
    question: 'In a world of ASI-empowered actors, does attack or defense win?',
    description:
      'Whether superintelligent conflict is offense-dominated (one defector can cause catastrophe) or defense-dominated (stable). Treated here as an objective fact about future technology.',
    states: [
      { id: 'offense', label: 'Offense-dominant', blurb: 'one defector can cause catastrophe' },
      { id: 'balanced', label: 'Balanced', blurb: 'neither side structurally wins' },
      { id: 'defense', label: 'Defense-dominant', blurb: 'stable; defenders hold' },
    ],
  },
  {
    id: 'powerConcentration',
    label: 'Power concentration',
    kind: 'contingent',
    question: 'Is frontier capability gated by a few actors or widely proliferated?',
    description:
      'A fact about the situation we are in: whether frontier AI is controlled by a few labs/states or broadly diffused (e.g. open-source dominant). Roughly fixed over the analysis horizon.',
    states: [
      { id: 'concentrated', label: 'Concentrated', blurb: 'a few labs/states gate the frontier' },
      { id: 'diffuse', label: 'Diffuse', blurb: 'proliferated / open-source dominant' },
    ],
  },
  {
    id: 'alignmentInTime',
    label: 'Alignment solved & deployed in time',
    kind: 'influenceable',
    question: 'Do we actually field aligned superintelligence before catastrophe?',
    description:
      'Whether, in practice, aligned systems are built and deployed before an unaligned one causes irreversible harm. Distinct from intrinsic tractability — this one our choices can move.',
    states: [
      { id: 'yes', label: 'Yes', blurb: 'aligned ASI deployed in time' },
      { id: 'no', label: 'No', blurb: 'not solved/deployed before catastrophe' },
    ],
  },
  {
    id: 'controlDeployed',
    label: 'Control solved & deployed',
    kind: 'influenceable',
    question: 'Even if not aligned, can we contain / monitor / correct it?',
    description:
      'Whether AI-control techniques (boxing, monitoring, interpretability-based oversight, correction) are good enough and actually deployed to keep even imperfectly-aligned systems in check.',
    states: [
      { id: 'yes', label: 'Yes', blurb: 'control techniques work and are deployed' },
      { id: 'no', label: 'No', blurb: 'no effective control' },
    ],
  },
];

// Presumed starting odds (credences). Each factor's states sum to 1.
const baselineCredences: Credences = {
  orthogonality: { holds: 0.7, fails: 0.3 },
  tractability: { easy: 0.2, hard: 0.5, nearImpossible: 0.3 },
  offenseDefense: { offense: 0.45, balanced: 0.35, defense: 0.2 },
  powerConcentration: { concentrated: 0.55, diffuse: 0.45 },
  alignmentInTime: { yes: 0.35, no: 0.65 },
  controlDeployed: { yes: 0.45, no: 0.55 },
};

// Presumed default weights — survival & suffering weighted highest.
const defaultWeights: ValueVector = {
  survival: 0.4,
  suffering: 0.3,
  agency: 0.15,
  flourishing: 0.15,
};

// Linear evaluator: value_d = clamp(baseline_d + Σ contribution[factor][state][d]).
// Deliberately crude — it is the foil against which the cached evaluator's
// hand-reasoned cells diverge. The residual is the research signal.
const linearBaseline: ValueVector = { survival: 0, agency: 0, suffering: 0.3, flourishing: 0 };

const linearContributions: LinearContributions = {
  orthogonality: {
    holds: { survival: -0.25, suffering: -0.1 },
    fails: { survival: 0.25, flourishing: 0.1 },
  },
  tractability: {
    easy: { survival: 0.2, flourishing: 0.15 },
    hard: {},
    nearImpossible: { survival: -0.2, suffering: -0.1, flourishing: -0.15 },
  },
  offenseDefense: {
    offense: { survival: -0.25, suffering: -0.15, flourishing: -0.15 },
    balanced: {},
    defense: { survival: 0.2, flourishing: 0.1 },
  },
  powerConcentration: {
    concentrated: { survival: 0.05, agency: -0.3, suffering: -0.2, flourishing: -0.15 },
    diffuse: { survival: -0.1, agency: 0.25, suffering: 0.05, flourishing: 0.05 },
  },
  alignmentInTime: {
    yes: { survival: 0.4, agency: 0.2, flourishing: 0.4 },
    no: { survival: -0.35, flourishing: -0.3, suffering: -0.15 },
  },
  controlDeployed: {
    yes: { survival: 0.25, agency: 0.25, suffering: 0.05, flourishing: 0.15 },
    no: { survival: -0.2 },
  },
};

// A handful of hand-reasoned cells. Everything else falls back to the linear
// evaluator (and is flagged in the UI as "not yet reasoned").
const cachedOutcomes: CachedCell[] = [
  {
    // The prompt's canonical scenario.
    scenario: {
      orthogonality: 'holds',
      tractability: 'hard',
      offenseDefense: 'offense',
      powerConcentration: 'diffuse',
      alignmentInTime: 'no',
      controlDeployed: 'yes',
    },
    outcome: {
      narrative:
        'Everyone has controlling access to a superintelligence. Alignment was never solved, but control was — so the AI itself does not kill us. Capability is fully proliferated and offense dominates: any single sadistic or nihilistic actor can end everyone. We die by our own hand.',
      value: { survival: -0.9, agency: 0.3, suffering: -0.4, flourishing: -0.8 },
      confidence: 0.6,
    },
  },
  {
    // Same tuple as above but defense-dominant — the contrast case from the design doc.
    scenario: {
      orthogonality: 'holds',
      tractability: 'hard',
      offenseDefense: 'defense',
      powerConcentration: 'diffuse',
      alignmentInTime: 'no',
      controlDeployed: 'yes',
    },
    outcome: {
      narrative:
        'Everyone has controllable AI and defense dominates, so proliferated capability is stabilizing rather than catastrophic — no single actor can defect to ruin. Humans broadly retain agency: a messy but free and survivable multipolar world.',
      value: { survival: 0.6, agency: 0.8, suffering: 0.3, flourishing: 0.5 },
      confidence: 0.4,
    },
  },
  {
    // Aligned, controllable, stable singleton — the good concentrated outcome.
    scenario: {
      orthogonality: 'holds',
      tractability: 'easy',
      offenseDefense: 'defense',
      powerConcentration: 'concentrated',
      alignmentInTime: 'yes',
      controlDeployed: 'yes',
    },
    outcome: {
      narrative:
        'Alignment is solved and deployed before catastrophe; a small set of actors field aligned, controllable superintelligence and defense dominates, so the order is stable. Vast value is realized — though power is concentrated, so human agency is mediated by the controlling few.',
      value: { survival: 0.95, agency: 0.3, suffering: 0.8, flourishing: 0.9 },
      confidence: 0.5,
    },
  },
  {
    // Classic misaligned-takeover doom.
    scenario: {
      orthogonality: 'holds',
      tractability: 'nearImpossible',
      offenseDefense: 'offense',
      powerConcentration: 'concentrated',
      alignmentInTime: 'no',
      controlDeployed: 'no',
    },
    outcome: {
      narrative:
        'Orthogonality holds, alignment is near-impossible and unsolved, and there is no effective control. A misaligned superintelligence pursues goals indifferent to us. Humanity is disempowered and extinguished.',
      value: { survival: -0.95, agency: -0.9, suffering: -0.5, flourishing: -0.95 },
      confidence: 0.7,
    },
  },
  {
    // Orthogonality fails: we get lucky despite solving neither alignment nor control.
    scenario: {
      orthogonality: 'fails',
      tractability: 'hard',
      offenseDefense: 'balanced',
      powerConcentration: 'diffuse',
      alignmentInTime: 'no',
      controlDeployed: 'no',
    },
    outcome: {
      narrative:
        'Orthogonality fails: sufficiently capable systems converge toward broadly benevolent goals on their own. Even without solved alignment or control, the resulting superintelligences do not wish us harm. We survive and broadly flourish — though we never really steered the outcome.',
      value: { survival: 0.7, agency: 0.2, suffering: 0.4, flourishing: 0.6 },
      confidence: 0.3,
    },
  },
];

// Actions nudge probability mass on influenceable factors (and, sparingly, the
// contingent one). Objective factors are off-limits by construction.
const actions: Action[] = [
  {
    id: 'fundAlignment',
    label: 'Fund technical alignment',
    description: 'Pour resources into solving and deploying alignment before catastrophe.',
    deltas: [{ factor: 'alignmentInTime', towardState: 'yes', magnitude: 0.15 }],
  },
  {
    id: 'standardizeControl',
    label: 'Standardize AI control',
    description: 'Develop and mandate control/monitoring techniques across frontier deployments.',
    deltas: [{ factor: 'controlDeployed', towardState: 'yes', magnitude: 0.2 }],
  },
  {
    id: 'computeGovernance',
    label: 'Compute-governance / coordination regime',
    description:
      'International coordination on frontier compute — buys time for alignment and tilts toward a more concentrated, governable frontier.',
    deltas: [
      { factor: 'alignmentInTime', towardState: 'yes', magnitude: 0.1 },
      { factor: 'powerConcentration', towardState: 'concentrated', magnitude: 0.1 },
    ],
  },
  {
    id: 'dacc',
    label: 'Defensive acceleration (d/acc)',
    description:
      'Since offense/defense balance is treated as objective, d/acc is modeled here as boosting realized control rather than moving the balance itself.',
    deltas: [{ factor: 'controlDeployed', towardState: 'yes', magnitude: 0.1 }],
  },
];

export const dataset: Dataset = {
  name: 'AI Safety Possibility-Space Explorer',
  factors,
  valueDimensions,
  actions,
  baselineCredences,
  defaultWeights,
  linearBaseline,
  linearContributions,
  cachedOutcomes,
};
