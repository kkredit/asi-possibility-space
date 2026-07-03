import type {
  Action,
  BayesNet,
  CachedCell,
  Coupling,
  Credences,
  Dataset,
  Factor,
  LinearContributions,
  Scenario,
  ValueDimension,
  ValueVector,
} from './types';
import { factorBackgrounds } from './factorBackground';

/**
 * ============================================================================
 *  MODEL CONTENT — the one file to edit.
 * ============================================================================
 * Every number, factor, state, action, and narrative below is authored content:
 * a considered estimate meant to be argued with and refined, not ground truth.
 * The engine and UI are content-agnostic — this is where the model lives. The
 * design decisions behind it (value dims, factor set, offense/defense as
 * objective, the probability model, no action-cost term, name) are recorded in
 * docs/DESIGN.md §9.
 *
 * Structure: 9 factors → 1,728 scenarios; a cached hand-reasoned value surface
 * (§ cell/failsTable/expand* below); couplings + a Bayes net for the joint.
 * ============================================================================
 */

const valueDimensions: ValueDimension[] = [
  { id: 'survival', label: 'Survival', lowLabel: 'humanity ends', highLabel: 'humanity persists' },
  { id: 'agency', label: 'Agency', lowLabel: 'lock-in / tyranny', highLabel: 'self-determination' },
  { id: 'suffering', label: 'Suffering', lowLabel: 's-risk (astronomical)', highLabel: 'no mass suffering' },
  { id: 'flourishing', label: 'Flourishing', lowLabel: 'value squandered', highLabel: 'value realized' },
];

const factorDefs: Factor[] = [
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
    id: 'takeoff',
    label: 'Takeoff speed',
    kind: 'objective',
    question: 'How abruptly does capability cross from roughly-human to decisively-superhuman?',
    description:
      'A fact about how the technology scales: a fast (hard) takeoff leaves little calendar time to react and tends to hand a decisive advantage to whoever crosses first; a slow (soft) takeoff lets oversight, alignment, control, and other actors keep pace. Strongly coupled to power concentration (fast ⇒ concentrated) and to whether alignment/control land in time.',
    states: [
      { id: 'fast', label: 'Fast', blurb: 'hard takeoff — months/weeks; little time to react' },
      { id: 'medium', label: 'Medium', blurb: 'a few years; oversight strains to keep pace' },
      { id: 'slow', label: 'Slow', blurb: 'soft takeoff — a decade+; institutions can adapt' },
    ],
  },
  {
    id: 'powerConcentration',
    label: 'Power concentration',
    kind: 'influenceable',
    question: 'Is frontier capability gated by a few actors or widely proliferated?',
    description:
      'Whether, at ASI onset, frontier capability is controlled by a few labs/states or broadly diffused (e.g. open-source dominant). It is influenceable in principle — antitrust, open-source policy, compute allocation and licensing all push on it — though how much leverage you think we really have is encoded in the slider and the couplings (e.g. fast takeoff concentrates regardless).',
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
  {
    id: 'coordination',
    label: 'Coordination regime',
    kind: 'influenceable',
    question: 'Do we achieve a binding regime that coordinates frontier development?',
    description:
      'Whether a real coordination/governance regime over frontier AI is achieved — international agreements, compute governance, enforced safety standards — versus an uncoordinated free-for-all. Our choices can move it; its main effect is upstream, buying time and raising the odds that alignment and control are solved and deployed in time. Note the model assumes a regime governs via a governable few, so it also tilts power toward concentration (licensing, compute allocation); flip the coordination→power coupling/CPT if you think governance would instead mandate openness and diffuse it.',
    states: [
      { id: 'regime', label: 'Regime', blurb: 'binding coordination / governance achieved' },
      { id: 'none', label: 'None', blurb: 'uncoordinated; each actor races' },
    ],
  },
  {
    id: 'deception',
    label: 'Deceptive alignment',
    kind: 'objective',
    question: 'Do capable systems systematically deceive oversight until decisively advantaged?',
    description:
      'Whether the default of training capable systems is deceptive alignment / a "sharp left turn" — behaving well under evaluation, then defecting once decisively capable — versus systems being faithful, so what you test is what you get. A structural fact about how learning scales. Load-bearing because it decides whether deployed CONTROL can actually be trusted: if deception is the default, control evaluations are fooled and a "controlled-but-misaligned" world collapses toward catastrophe; alignment we think we verified may be false.',
    states: [
      { id: 'deceptive', label: 'Deceptive', blurb: 'behaves under eval, defects when decisively capable' },
      { id: 'faithful', label: 'Faithful', blurb: 'no systematic deception; tests are trustworthy' },
    ],
  },
];

// Attach the scholarly "learn more" background to each factor (kept in a separate
// module so the debate/reading content lives apart from the modelling numbers).
const factors: Factor[] = factorDefs.map((f) => ({ ...f, background: factorBackgrounds[f.id] }));

// Starting odds (default credences). Each factor's states sum to 1.
const baselineCredences: Credences = {
  orthogonality: { holds: 0.8, fails: 0.2 },
  tractability: { easy: 0.1, hard: 0.6, nearImpossible: 0.3 },
  offenseDefense: { offense: 0.7, balanced: 0.2, defense: 0.1 },
  takeoff: { fast: 0.2, medium: 0.6, slow: 0.2 },
  powerConcentration: { concentrated: 0.8, diffuse: 0.2 },
  alignmentInTime: { yes: 0.65, no: 0.35 },
  controlDeployed: { yes: 0.45, no: 0.55 },
  coordination: { regime: 0.75, none: 0.25 },
  deception: { deceptive: 0.35, faithful: 0.65 },
};

// Default weights — survival & suffering weighted highest.
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
  takeoff: {
    fast: { survival: -0.15, agency: -0.1, suffering: -0.1, flourishing: -0.1 },
    medium: {},
    slow: { survival: 0.1, agency: 0.1, flourishing: 0.05 },
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
  // Coordination's DIRECT effect is small and mixed — collective restraint helps a
  // little (survival, less unilateral catastrophe) at a small agency cost
  // (centralization). Its real leverage is INDIRECT, via the couplings/Bayes net
  // below (it buys time for alignment & control).
  coordination: {
    regime: { survival: 0.06, agency: -0.07, suffering: 0.05, flourishing: 0.02 },
    none: {},
  },
  // Deception's DIRECT (linear) pull is modestly bad on average; its real bite is
  // corner-dependent (it guts a CONTROL world and falsifies a verified-ALIGNED one),
  // captured in the cached cells by expandDeception below.
  deception: {
    deceptive: { survival: -0.1, agency: -0.06, suffering: -0.06, flourishing: -0.08 },
    faithful: {},
  },
};

// ============================================================================
//  HAND-REASONED CELLS
// ----------------------------------------------------------------------------
// Authored by walking the space ONE FACTOR AT A TIME, so each cell reuses its
// neighbour's argument — but the outcome is re-examined at every step, never
// interpolated, because several boundaries flip hard (most sharply: offense vs.
// defense once capability is proliferated, and alignment vs. control once
// orthogonality holds). Value tuple is [survival, agency, suffering, flourishing],
// each in [-1, +1]. Un-listed scenarios fall back to the linear evaluator.
//
// These cells are authored over the original SIX factors; they are the MEDIUM-
// takeoff anchor. The fast/medium/slow variants of the full 432-cell space are then
// derived by `expandTakeoff` below, which adds a reasoned, corner-dependent delta
// (DOOM / CONTROL / ALIGNED / BENIGN) on top of each medium value. Medium is the
// base value verbatim, so all the hand-reasoning below is preserved exactly.
//
// Shared sub-arguments reused across the chains below:
//  (D) DOOM — orthogonality holds, neither aligned nor controlled: an uncontained
//      misaligned ASI takes over. The threat is *from within*, so the human-scale
//      offense/defense balance and power concentration barely move the result.
//  (C) CONTROL-MUDDLE — misaligned but contained: survival rides on the leash
//      holding; concentrated hands add tyranny risk (agency↓), diffuse hands make
//      offense/defense decisive (the "nihilist's-veto" knife-edge).
//  (A) ALIGNED — aligned in time: broadly good; concentration trades survival-safety
//      for agency (lock-in), and with alignment solved the residual danger is
//      deliberate human misuse, which control + defense-dominance contain.
//  (B) BENIGN — orthogonality fails: capable systems are benign regardless of our
//      alignment/control work; concentration (who directs the benign AI) and human
//      conflict (offense/defense) set how free and steady the good outcome is.
// ============================================================================

type ValueTuple = [survival: number, agency: number, suffering: number, flourishing: number];

function cell(
  orthogonality: string,
  tractability: string,
  offenseDefense: string,
  powerConcentration: string,
  alignmentInTime: string,
  controlDeployed: string,
  [survival, agency, suffering, flourishing]: ValueTuple,
  narrative: string,
  confidence = 0.4,
): CachedCell {
  return {
    scenario: {
      orthogonality,
      tractability,
      offenseDefense,
      powerConcentration,
      alignmentInTime,
      controlDeployed,
    },
    outcome: { narrative, value: { survival, agency, suffering, flourishing }, confidence },
  };
}

// ----------------------------------------------------------------------------
// FAILS branch, generated from a table. When orthogonality fails the AI is benign
// regardless of how hard alignment would have been, so tractability is MOOT: each
// (offenseDefense, powerConcentration, alignmentInTime, controlDeployed) combo is
// emitted identically at all three tractability levels. Concentration sets agency
// (who directs the benign AI); offense/defense sets how steady the transition is;
// our alignment/control work adds only marginal, partly-redundant assurance.
// ----------------------------------------------------------------------------
type FailsEntry = { off: string; conc: string; align: string; ctrl: string; v: ValueTuple; narrative: string };

const failsTable: FailsEntry[] = [
  // offense-dominant
  { off: 'offense', conc: 'concentrated', align: 'no', ctrl: 'no', v: [0.68, -0.1, 0.35, 0.52],
    narrative: 'Benign AI, but offense-dominant friction and concentrated control over it make for a paternalistic, somewhat unsteady peace; alignment difficulty is moot.' },
  { off: 'offense', conc: 'concentrated', align: 'no', ctrl: 'yes', v: [0.73, -0.07, 0.41, 0.56],
    narrative: 'Benign AI with a deployed control layer, concentrated and offense-dominant: marginally steadier, still paternalistic.' },
  { off: 'offense', conc: 'concentrated', align: 'yes', ctrl: 'no', v: [0.74, -0.06, 0.43, 0.58],
    narrative: 'Benign AI we also aligned, concentrated and offense-dominant: a little more assurance, agency still thin.' },
  { off: 'offense', conc: 'concentrated', align: 'yes', ctrl: 'yes', v: [0.77, -0.05, 0.46, 0.62],
    narrative: 'Benign AI, aligned and controlled, concentrated under offense-dominance: safe and prosperous but paternalistic; the safety work was largely redundant.' },
  { off: 'offense', conc: 'diffuse', align: 'no', ctrl: 'no', v: [0.7, 0.35, 0.38, 0.58],
    narrative: 'Benign AI widely distributed; offense-dominant human friction adds turbulence the benign systems damp. Free and largely good.' },
  { off: 'offense', conc: 'diffuse', align: 'no', ctrl: 'yes', v: [0.76, 0.38, 0.45, 0.62],
    narrative: 'Benign AI plus a control layer dampens even offense-dominant misuse in a distributed world; survivable and fairly free.' },
  { off: 'offense', conc: 'diffuse', align: 'yes', ctrl: 'no', v: [0.76, 0.39, 0.46, 0.64],
    narrative: 'Benign, aligned AI distributed under offense-dominance: free, with the redundant alignment work adding a little margin.' },
  { off: 'offense', conc: 'diffuse', align: 'yes', ctrl: 'yes', v: [0.79, 0.4, 0.49, 0.68],
    narrative: 'Benign, aligned, controlled AI everywhere; offense-dominant misuse is fully damped. Free and prosperous.' },
  // balanced
  { off: 'balanced', conc: 'concentrated', align: 'no', ctrl: 'no', v: [0.74, -0.05, 0.42, 0.58],
    narrative: 'Benign AI directed by a concentrated few, no sharp offense/defense tilt: safe and fairly prosperous, agency thin.' },
  { off: 'balanced', conc: 'concentrated', align: 'no', ctrl: 'yes', v: [0.79, -0.02, 0.48, 0.62],
    narrative: 'Benign AI plus control, concentrated: steady and safe, still paternalistic.' },
  { off: 'balanced', conc: 'concentrated', align: 'yes', ctrl: 'no', v: [0.8, 0.0, 0.5, 0.65],
    narrative: 'Benign AI directed by a concentrated few who also solved alignment — safe and prosperous, but paternalistic.' },
  { off: 'balanced', conc: 'concentrated', align: 'yes', ctrl: 'yes', v: [0.83, 0.01, 0.53, 0.68],
    narrative: 'Benign, aligned, controlled AI, concentrated: very safe, agency thin; the safety work was redundant given benevolence.' },
  { off: 'balanced', conc: 'diffuse', align: 'no', ctrl: 'no', v: [0.7, 0.4, 0.4, 0.6],
    narrative: 'Orthogonality fails: sufficiently capable systems converge toward broadly benevolent goals on their own. Even without solved alignment or control, the resulting superintelligences do not wish us harm. We survive and broadly flourish — though we never really steered the outcome.' },
  { off: 'balanced', conc: 'diffuse', align: 'no', ctrl: 'yes', v: [0.75, 0.43, 0.46, 0.64],
    narrative: 'Benign AI distributed with a control layer, balanced offense/defense: a free, steady, prosperous world.' },
  { off: 'balanced', conc: 'diffuse', align: 'yes', ctrl: 'no', v: [0.76, 0.44, 0.48, 0.66],
    narrative: 'Benign, aligned AI distributed, balanced: free and prosperous; alignment added assurance we did not strictly need.' },
  { off: 'balanced', conc: 'diffuse', align: 'yes', ctrl: 'yes', v: [0.79, 0.45, 0.51, 0.7],
    narrative: 'Benign, aligned, controlled AI, distributed, balanced: a free and flourishing world.' },
  // defense-dominant
  { off: 'defense', conc: 'concentrated', align: 'no', ctrl: 'no', v: [0.8, 0.0, 0.5, 0.63],
    narrative: 'Benign AI, defense-dominant but concentrated: a steady, prosperous, mildly paternalistic order.' },
  { off: 'defense', conc: 'concentrated', align: 'no', ctrl: 'yes', v: [0.85, 0.03, 0.56, 0.67],
    narrative: 'Benign AI plus control, defense-dominant, concentrated: very steady and safe, agency thin.' },
  { off: 'defense', conc: 'concentrated', align: 'yes', ctrl: 'no', v: [0.86, 0.04, 0.58, 0.69],
    narrative: 'Benign, aligned AI, defense-dominant, concentrated: very safe, paternalistic.' },
  { off: 'defense', conc: 'concentrated', align: 'yes', ctrl: 'yes', v: [0.86, 0.05, 0.6, 0.72],
    narrative: 'Benign, aligned, controlled AI in a stable defense-dominant world but concentrated hands — very safe, low suffering, yet agency is thin.' },
  { off: 'defense', conc: 'diffuse', align: 'no', ctrl: 'no', v: [0.82, 0.45, 0.55, 0.7],
    narrative: 'Benign AI, widely distributed, defense-dominant — humanity survives with broad agency and flourishes, having lucked into it rather than steered.' },
  { off: 'defense', conc: 'diffuse', align: 'no', ctrl: 'yes', v: [0.87, 0.48, 0.61, 0.74],
    narrative: 'Benign AI plus control, distributed, defense-dominant: a free, very safe, flourishing world.' },
  { off: 'defense', conc: 'diffuse', align: 'yes', ctrl: 'no', v: [0.88, 0.49, 0.63, 0.76],
    narrative: 'Benign, aligned AI, distributed, defense-dominant: free and richly flourishing.' },
  { off: 'defense', conc: 'diffuse', align: 'yes', ctrl: 'yes', v: [0.88, 0.48, 0.62, 0.78],
    narrative: 'Orthogonality fails so the AI is benign anyway, and we additionally solved alignment and control in a distributed, defense-dominant world — belt and suspenders; about as good as it gets.' },
];

const failsCells: CachedCell[] = (['easy', 'hard', 'nearImpossible'] as const).flatMap((tract) =>
  failsTable.map((e) => cell('fails', tract, e.off, e.conc, e.align, e.ctrl, e.v, e.narrative, 0.35)),
);

const baseCells: CachedCell[] = [
  // ==========================================================================
  // GROUP 1 — orthogonality HOLDS, tractability HARD (the high-stakes backbone).
  // Full 3×2×2×2 = 24-cell slice, grouped by (alignment, control).
  // ==========================================================================

  // (no, no) — argument (D) DOOM. Vary offense/defense × concentration and confirm
  // it barely matters: the killer is the uncontained ASI, not human geopolitics.
  cell('holds', 'hard', 'offense', 'concentrated', 'no', 'no', [-0.95, -0.92, -0.5, -0.95],
    'A single uncontained, misaligned superintelligence takes over and pursues goals indifferent to us; concentration just names the one uncontested winner. Humanity is disempowered and extinguished.', 0.7),
  cell('holds', 'hard', 'balanced', 'concentrated', 'no', 'no', [-0.95, -0.92, -0.48, -0.95],
    'As the offense-dominant twin: an uncontained misaligned-ASI takeover does not hinge on the balance of power *between humans* — the lethal actor is the AI. Extinction.', 0.7),
  cell('holds', 'hard', 'defense', 'concentrated', 'no', 'no', [-0.93, -0.9, -0.45, -0.93],
    'Defense-dominance among human actors scarcely helps when the threat comes from within: the uncontained ASI. Near-total loss, at most marginally slower.', 0.65),
  cell('holds', 'hard', 'offense', 'diffuse', 'no', 'no', [-0.96, -0.92, -0.55, -0.96],
    'Several uncontained misaligned ASIs in an offense-dominant world — a fast, chaotic takeover and end.', 0.7),
  cell('holds', 'hard', 'balanced', 'diffuse', 'no', 'no', [-0.95, -0.92, -0.52, -0.95],
    'Multiple uncontained misaligned ASIs; the human offense/defense balance is a rounding error against superintelligent disempowerment. Extinction.', 0.7),
  cell('holds', 'hard', 'defense', 'diffuse', 'no', 'no', [-0.94, -0.9, -0.5, -0.94],
    'Proliferated, uncontained misaligned ASIs even in a defense-dominant world: defenses tuned to human adversaries do not hold against the systems themselves. We lose.', 0.65),

  // (no, yes) — argument (C) CONTROL-MUDDLE. Now the leash exists. Concentration sets
  // tyranny risk; once diffuse, offense/defense becomes decisive (this is where the
  // canonical "we control it but a nihilist ends us" lives).
  cell('holds', 'hard', 'offense', 'concentrated', 'no', 'yes', [0.3, -0.3, -0.2, 0.1],
    'A few actors hold misaligned-but-leashed ASI; offense-dominance and the standing chance of the leash slipping make it precarious, and concentrated misaligned power invites tyranny.', 0.45),
  cell('holds', 'hard', 'balanced', 'concentrated', 'no', 'yes', [0.45, -0.2, -0.05, 0.2],
    'Containment in a few hands with no decisive offense/defense tilt: survivable but uneasy, with concentrated power over leashed-but-misaligned systems.', 0.45),
  cell('holds', 'hard', 'defense', 'concentrated', 'no', 'yes', [0.6, -0.1, 0.1, 0.3],
    'Containment plus defense-dominance lets a few actors hold misaligned systems in check fairly stably — survivable, though power stays concentrated and the leash could still slip.', 0.45),
  cell('holds', 'hard', 'offense', 'diffuse', 'no', 'yes', [-0.9, 0.3, -0.4, -0.8],
    'Everyone has controlling access to a superintelligence. Alignment was never solved, but control was — so the AI itself does not kill us. Capability is fully proliferated and offense dominates: any single sadistic or nihilistic actor can end everyone. We die by our own hand.', 0.6),
  cell('holds', 'hard', 'balanced', 'diffuse', 'no', 'yes', [-0.1, 0.6, 0.0, 0.0],
    'Everyone has misaligned-but-controllable AI; with offense and defense balanced, society lives on a knife-edge where only the leash holding separates order from ruin. Agency is high precisely because capability is everywhere.', 0.4),
  cell('holds', 'hard', 'defense', 'diffuse', 'no', 'yes', [0.6, 0.8, 0.3, 0.5],
    'Everyone has controllable AI and defense dominates, so proliferated capability is stabilizing rather than catastrophic — no single actor can defect to ruin. Humans broadly retain agency: a messy but free and survivable multipolar world.', 0.4),

  // (yes, no) — argument (A) ALIGNED, no control backstop. Aligned systems mostly do
  // not need a leash; the cost of missing control is only fragility if alignment is
  // subtly imperfect, so these sit a notch below their (yes, yes) twins.
  cell('holds', 'hard', 'offense', 'concentrated', 'yes', 'no', [0.85, 0.18, 0.68, 0.76],
    'Aligned ASI fielded by a few; with no control backstop the residual risks are subtle misalignment and offense-dominant great-power friction, but alignment carries us. Survival high, agency mediated by the controlling few.', 0.45),
  cell('holds', 'hard', 'balanced', 'concentrated', 'yes', 'no', [0.88, 0.22, 0.72, 0.8],
    'Aligned ASI in a few hands, no sharp offense/defense tilt and no control backstop: safe and prosperous, agency thin.', 0.45),
  cell('holds', 'hard', 'defense', 'concentrated', 'yes', 'no', [0.92, 0.28, 0.76, 0.85],
    'Aligned ASI, defense-dominant, concentrated: very safe even without a control layer, but the future is steered by the few.', 0.45),
  cell('holds', 'hard', 'offense', 'diffuse', 'yes', 'no', [0.42, 0.72, 0.02, 0.5],
    'Aligned ASI is everywhere but there is no control infrastructure; since systems are aligned the danger is deliberate human misuse, which nothing catches under offense-dominance. Tense, with widely distributed agency.', 0.4),
  cell('holds', 'hard', 'balanced', 'diffuse', 'yes', 'no', [0.66, 0.78, 0.35, 0.66],
    'Distributed aligned ASI, no control layer, balanced offense/defense: a free and largely prosperous world carrying a tail risk of unchecked misuse.', 0.4),
  cell('holds', 'hard', 'defense', 'diffuse', 'yes', 'no', [0.87, 0.83, 0.55, 0.83],
    'Distributed aligned ASI in a defense-dominant world; even without a control layer, no actor can defect to ruin. Free and flourishing.', 0.4),

  // (yes, yes) — argument (A) ALIGNED + leash: the best technical position. Same shape
  // as (yes, no) but a notch safer everywhere.
  cell('holds', 'hard', 'offense', 'concentrated', 'yes', 'yes', [0.9, 0.2, 0.75, 0.8],
    'Aligned, controllable ASI held by a few; offense-dominance is a worry but aligned + controlled + overseen systems stay stable. Survival high; agency mediated by the controlling few (lock-in risk).', 0.5),
  cell('holds', 'hard', 'balanced', 'concentrated', 'yes', 'yes', [0.92, 0.25, 0.78, 0.83],
    'Aligned and controllable in a few hands, no decisive offense/defense tilt: very safe and prosperous, agency thin.', 0.5),
  cell('holds', 'hard', 'defense', 'concentrated', 'yes', 'yes', [0.95, 0.3, 0.8, 0.88],
    'Aligned, controllable ASI, defense-dominant, in few hands — extremely safe and prosperous, but agency rests with the controlling few. (The hard-tractability twin of the cached easy-tractability singleton.)', 0.5),
  cell('holds', 'hard', 'offense', 'diffuse', 'yes', 'yes', [0.5, 0.75, 0.1, 0.55],
    'Everyone holds aligned, controllable ASI; because systems are aligned the danger is deliberate misuse, which monitoring catches imperfectly under offense-dominance. Survivable but tense; agency widely distributed.', 0.45),
  cell('holds', 'hard', 'balanced', 'diffuse', 'yes', 'yes', [0.72, 0.8, 0.4, 0.7],
    'Distributed aligned + controllable ASI, balanced offense/defense: a free, largely safe and prosperous multipolar world.', 0.45),
  cell('holds', 'hard', 'defense', 'diffuse', 'yes', 'yes', [0.9, 0.85, 0.6, 0.85],
    'Distributed aligned, controllable ASI in a defense-dominant world: no actor can defect to ruin, power is spread — a free, flourishing multipolar peace.', 0.45),

  // ==========================================================================
  // GROUP 2 — orthogonality HOLDS, tractability NEAR-IMPOSSIBLE, alignment = NO.
  // Reuse Group 1's (no, *) arguments, shifted: deeply-unsolvable alignment makes the
  // control leash more brittle, so control-muddle survival drops and doom is a touch
  // worse / more suffering-laden. (alignment = yes is omitted: near-impossible + solved
  // is a low-probability heroic case left to the linear fallback.)
  // ==========================================================================

  // (no, no) — DOOM, slightly worse than Group 1: a deeply misaligned system.
  cell('holds', 'nearImpossible', 'offense', 'concentrated', 'no', 'no', [-0.96, -0.93, -0.53, -0.96],
    'Orthogonality holds, alignment is near-impossible and unsolved, and there is no effective control. A misaligned superintelligence pursues goals indifferent to us. Humanity is disempowered and extinguished.', 0.7),
  cell('holds', 'nearImpossible', 'balanced', 'concentrated', 'no', 'no', [-0.96, -0.93, -0.52, -0.96],
    'Deeply misaligned and uncontained in a few hands; the human offense/defense balance is irrelevant to a takeover. Extinction.', 0.7),
  cell('holds', 'nearImpossible', 'defense', 'concentrated', 'no', 'no', [-0.95, -0.92, -0.5, -0.95],
    'Defense-dominance cannot defend against the uncontained, deeply-misaligned system itself. We lose.', 0.68),
  cell('holds', 'nearImpossible', 'offense', 'diffuse', 'no', 'no', [-0.97, -0.93, -0.58, -0.97],
    'Many deeply-misaligned, uncontained ASIs in an offense-dominant world — the worst doom corner: fast, total, and with elevated suffering risk in the chaos.', 0.7),
  cell('holds', 'nearImpossible', 'balanced', 'diffuse', 'no', 'no', [-0.96, -0.93, -0.55, -0.96],
    'Proliferated deeply-misaligned uncontained ASIs; balance among humans is moot. Extinction with substantial suffering risk.', 0.7),
  cell('holds', 'nearImpossible', 'defense', 'diffuse', 'no', 'no', [-0.95, -0.92, -0.52, -0.95],
    'Even defense-dominant, proliferated uncontained misaligned ASIs overwhelm human-tuned defenses. We lose.', 0.68),

  // (no, yes) — CONTROL-MUDDLE on a more brittle leash than Group 1's hard-tractability
  // analogues: every survivable cell shifts down, every catastrophic one shifts down.
  cell('holds', 'nearImpossible', 'offense', 'concentrated', 'no', 'yes', [0.2, -0.35, -0.25, 0.02],
    'Control restrains a deeply-misaligned system in a few hands — more brittle than the merely-hard case, offense-dominant, concentrated: precarious and tyranny-prone.', 0.4),
  cell('holds', 'nearImpossible', 'balanced', 'concentrated', 'no', 'yes', [0.35, -0.25, -0.1, 0.12],
    'A brittle leash on deeply-misaligned systems, concentrated, no decisive offense/defense tilt: survivable but anxious and autocracy-prone.', 0.4),
  cell('holds', 'nearImpossible', 'defense', 'concentrated', 'no', 'yes', [0.5, -0.15, 0.05, 0.22],
    'Defense-dominance buys a brittle containment of deeply-misaligned systems in few hands extra margin — survivable, with concentrated power.', 0.4),
  cell('holds', 'nearImpossible', 'offense', 'diffuse', 'no', 'yes', [-0.92, 0.25, -0.45, -0.82],
    'The proliferated-control "nihilist\'s veto" ending, but the leashed systems are deeply misaligned, so control is more brittle and the bad ending arrives a little more surely.', 0.45),
  cell('holds', 'nearImpossible', 'balanced', 'diffuse', 'no', 'yes', [-0.2, 0.55, -0.08, -0.05],
    'Distributed brittle leashes on deeply-misaligned systems, balanced offense/defense: a more dangerous knife-edge than the hard-tractability version.', 0.4),
  cell('holds', 'nearImpossible', 'defense', 'diffuse', 'no', 'yes', [0.5, 0.78, 0.22, 0.42],
    'Even deeply-misaligned systems, if contained and in a defense-dominant distributed world, leave a survivable if anxious peace — the leash doing all the work.', 0.4),

  // ==========================================================================
  // GROUP 3 — orthogonality HOLDS, tractability EASY, alignment = YES.
  // Reuse Group 1's (yes, *) arguments, shifted up: an easy problem solved yields a
  // robust, widely-shareable alignment solution (better flourishing/agency, esp. when
  // diffuse). (alignment = no with an *easy* problem is the tragic "we fumbled it"
  // case — same outcome as not-aligned — left to the linear fallback.)
  // ==========================================================================

  // (yes, yes)
  cell('holds', 'easy', 'offense', 'concentrated', 'yes', 'yes', [0.92, 0.22, 0.78, 0.83],
    'Robust, easily-won alignment plus control in a few hands; offense-dominance is contained by overseen, aligned systems. Very safe; agency still concentrated.', 0.5),
  cell('holds', 'easy', 'balanced', 'concentrated', 'yes', 'yes', [0.94, 0.27, 0.8, 0.86],
    'Robust alignment + control, concentrated, no sharp offense/defense tilt: about as safe as a concentrated world gets, agency aside.', 0.5),
  cell('holds', 'easy', 'defense', 'concentrated', 'yes', 'yes', [0.95, 0.3, 0.8, 0.9],
    'Alignment is solved and deployed before catastrophe; a small set of actors field aligned, controllable superintelligence and defense dominates, so the order is stable. Vast value is realized — though power is concentrated, so human agency is mediated by the controlling few.', 0.5),
  cell('holds', 'easy', 'offense', 'diffuse', 'yes', 'yes', [0.55, 0.77, 0.15, 0.6],
    'Robust alignment is widely shared, but offense-dominance plus proliferation still leaves deliberate-misuse risk that monitoring only partly catches. Free and mostly safe.', 0.45),
  cell('holds', 'easy', 'balanced', 'diffuse', 'yes', 'yes', [0.76, 0.82, 0.45, 0.74],
    'Robust, widely-shared alignment + control, balanced offense/defense, distributed: a free and prosperous multipolar world.', 0.45),
  cell('holds', 'easy', 'defense', 'diffuse', 'yes', 'yes', [0.92, 0.87, 0.65, 0.88],
    'Robust, widely-shared alignment plus control, distributed, defense-dominant — a free and richly flourishing world; about as good as a hard-takeoff-risk timeline gets.', 0.5),

  // (yes, no) — same shape, a notch below for the missing control backstop.
  cell('holds', 'easy', 'offense', 'concentrated', 'yes', 'no', [0.88, 0.2, 0.72, 0.8],
    'Robustly aligned ASI in a few hands without a control layer; alignment carries us through offense-dominant friction. Safe; agency concentrated.', 0.45),
  cell('holds', 'easy', 'balanced', 'concentrated', 'yes', 'no', [0.9, 0.24, 0.76, 0.83],
    'Robust alignment, concentrated, no control backstop, no decisive offense/defense tilt: safe and prosperous, agency thin.', 0.45),
  cell('holds', 'easy', 'defense', 'concentrated', 'yes', 'no', [0.93, 0.3, 0.78, 0.87],
    'Robust alignment, defense-dominant, concentrated, no leash needed: very safe, future steered by the few.', 0.45),
  cell('holds', 'easy', 'offense', 'diffuse', 'yes', 'no', [0.47, 0.74, 0.06, 0.55],
    'Robust alignment everywhere but no control layer and offense-dominant: free, with a real tail of unchecked deliberate misuse.', 0.4),
  cell('holds', 'easy', 'balanced', 'diffuse', 'yes', 'no', [0.7, 0.8, 0.4, 0.7],
    'Robust, widely-shared alignment, distributed, balanced offense/defense, no leash: a free and prosperous world with a modest misuse tail.', 0.45),
  cell('holds', 'easy', 'defense', 'diffuse', 'yes', 'no', [0.89, 0.85, 0.6, 0.85],
    'Robust, distributed alignment in a defense-dominant world; no control layer needed — free and flourishing.', 0.45),

  // ==========================================================================
  // GROUP 5 — orthogonality HOLDS, tractability NEAR-IMPOSSIBLE, alignment = YES.
  // The heroic-but-fragile case: a near-impossible problem somehow solved and
  // deployed in time yields a narrow, brittle solution. Reuse Group 1's (yes, *)
  // arguments shifted DOWN ~[0.07, 0.03, 0.08, 0.10] for that fragility.
  // ==========================================================================

  // (yes, no)
  cell('holds', 'nearImpossible', 'offense', 'concentrated', 'yes', 'no', [0.78, 0.15, 0.6, 0.66],
    'A near-impossible problem is somehow aligned and deployed by a few, but the solution is fragile and narrow; offense-dominant friction and no control backstop keep it tense. Safe-ish, agency concentrated.'),
  cell('holds', 'nearImpossible', 'balanced', 'concentrated', 'yes', 'no', [0.81, 0.19, 0.64, 0.7],
    'A fragile, hard-won alignment in a few hands, no decisive offense/defense tilt, no control backstop: safe but brittle, agency thin.'),
  cell('holds', 'nearImpossible', 'defense', 'concentrated', 'yes', 'no', [0.85, 0.25, 0.68, 0.75],
    'Fragile but real alignment, defense-dominant, concentrated: very safe despite the brittleness; the future is steered by the few.'),
  cell('holds', 'nearImpossible', 'offense', 'diffuse', 'yes', 'no', [0.35, 0.69, -0.06, 0.4],
    'A fragile alignment solution distributed widely with no control layer under offense-dominance: free but precarious, brittleness plus misuse risk pulling it toward danger.'),
  cell('holds', 'nearImpossible', 'balanced', 'diffuse', 'yes', 'no', [0.59, 0.75, 0.27, 0.56],
    'Fragile distributed alignment, balanced offense/defense, no leash: free and mostly good but carrying real tail risk from the narrow solution.'),
  cell('holds', 'nearImpossible', 'defense', 'diffuse', 'yes', 'no', [0.8, 0.8, 0.47, 0.73],
    'Fragile but distributed alignment in a defense-dominant world: free and largely flourishing, the brittleness mattering less when no one can defect to ruin.'),

  // (yes, yes) — the control layer compensates for the fragile solution.
  cell('holds', 'nearImpossible', 'offense', 'concentrated', 'yes', 'yes', [0.83, 0.17, 0.67, 0.7],
    'Fragile hard-won alignment plus a control layer in a few hands; control compensates for the brittleness under offense-dominance. Safe, agency concentrated.'),
  cell('holds', 'nearImpossible', 'balanced', 'concentrated', 'yes', 'yes', [0.85, 0.22, 0.7, 0.73],
    'Fragile alignment plus control, concentrated, no sharp tilt: safe, the leash covering the narrow solution; agency thin.'),
  cell('holds', 'nearImpossible', 'defense', 'concentrated', 'yes', 'yes', [0.88, 0.27, 0.72, 0.78],
    'Fragile alignment plus control, defense-dominant, concentrated: very safe and steady; agency rests with the few.'),
  cell('holds', 'nearImpossible', 'offense', 'diffuse', 'yes', 'yes', [0.43, 0.72, 0.02, 0.45],
    'Fragile distributed alignment with a control layer under offense-dominance: control offsets brittleness and misuse risk; free and survivable but tense.'),
  cell('holds', 'nearImpossible', 'balanced', 'diffuse', 'yes', 'yes', [0.65, 0.77, 0.32, 0.6],
    'Fragile distributed alignment plus control, balanced: a free, largely safe multipolar world, the leash covering the narrow solution.'),
  cell('holds', 'nearImpossible', 'defense', 'diffuse', 'yes', 'yes', [0.83, 0.82, 0.52, 0.75],
    'Fragile distributed alignment plus control, defense-dominant: free and flourishing; brittleness scarcely matters when no actor can defect to ruin.'),

  // ==========================================================================
  // GROUP 6 — orthogonality HOLDS, tractability EASY, alignment = NO.
  // The tragic own-goal: an easy problem left undeployed (race / coordination
  // failure). Easy-to-align systems are more LEGIBLE, so vs. Group 1's hard (no, *)
  // analogues, doom is marginally less total (+~[0.05, 0.03, 0.05, 0.05]) and the
  // control leash is more robust (+~[0.10, 0.03, 0.10, 0.10]).
  // ==========================================================================

  // (no, no) — DOOM, marginally softened: the misalignment is milder / more correctable.
  cell('holds', 'easy', 'offense', 'concentrated', 'no', 'no', [-0.9, -0.89, -0.45, -0.9],
    'Alignment was easy but fumbled (a race / coordination own-goal) and left uncontained; one milder-but-misaligned ASI still takes over — marginally less total than the hard case, still extinction-level.', 0.6),
  cell('holds', 'easy', 'balanced', 'concentrated', 'no', 'no', [-0.9, -0.89, -0.43, -0.9],
    'Easy-but-undeployed alignment, uncontained, concentrated: a correctable misalignment we failed to correct; near-total loss, a touch less severe than the hard case.', 0.6),
  cell('holds', 'easy', 'defense', 'concentrated', 'no', 'no', [-0.88, -0.87, -0.4, -0.88],
    'Easy alignment fumbled and uncontained, defense-dominant: human defenses do not stop the milder misaligned ASI acting from within. Catastrophic, marginally softened.', 0.58),
  cell('holds', 'easy', 'offense', 'diffuse', 'no', 'no', [-0.91, -0.89, -0.5, -0.91],
    'Easy alignment fumbled across many proliferated, uncontained systems under offense-dominance: chaotic and near-total, though milder misalignment slightly limits the worst.', 0.6),
  cell('holds', 'easy', 'balanced', 'diffuse', 'no', 'no', [-0.9, -0.89, -0.47, -0.9],
    'Easy-but-undeployed alignment, proliferated and uncontained: near-total loss; the human balance is moot and milder misalignment only marginally helps.', 0.6),
  cell('holds', 'easy', 'defense', 'diffuse', 'no', 'no', [-0.89, -0.87, -0.45, -0.89],
    'Easy alignment fumbled, proliferated, uncontained, defense-dominant: the milder misaligned systems still overwhelm human defenses. Catastrophic, slightly softened.', 0.58),

  // (no, yes) — CONTROL-MUDDLE, but legible systems make the leash more robust.
  cell('holds', 'easy', 'offense', 'concentrated', 'no', 'yes', [0.4, -0.27, -0.1, 0.2],
    'Easy-to-align (hence legible) systems left unaligned but leashed in a few hands; legibility makes control robust, yet offense-dominance and concentrated power keep it tense and tyranny-prone.'),
  cell('holds', 'easy', 'balanced', 'concentrated', 'no', 'yes', [0.55, -0.17, 0.05, 0.3],
    'Legible, leashed systems in a few hands, no sharp tilt: a fairly robust containment, but concentrated power over them invites autocracy.'),
  cell('holds', 'easy', 'defense', 'concentrated', 'no', 'yes', [0.7, -0.07, 0.2, 0.4],
    'Legible, leashed systems, defense-dominant, concentrated: robust containment and stable, though power stays concentrated.'),
  cell('holds', 'easy', 'offense', 'diffuse', 'no', 'yes', [-0.8, 0.33, -0.3, -0.7],
    'Everyone holds leashed systems that are easy-to-align (so the leash is robust), but offense-dominant proliferation still hands a determined defector the veto; better than the hard-tractability nihilist ending, yet still grim.', 0.5),
  cell('holds', 'easy', 'balanced', 'diffuse', 'no', 'yes', [0.0, 0.63, 0.1, 0.1],
    'Legible, leashed systems everywhere, balanced offense/defense: a far steadier knife-edge than the hard case — control is robust because the systems are legible. Free.'),
  cell('holds', 'easy', 'defense', 'diffuse', 'no', 'yes', [0.7, 0.83, 0.4, 0.6],
    'Legible, leashed systems, distributed, defense-dominant: robust containment plus a stabilizing balance — a free, survivable, prosperous world.'),

  // FAILS branch: all 72 cells (24 combos × 3 tractabilities) generated from failsTable above.
  ...failsCells,
];

// ============================================================================
//  TAKEOFF EXPANSION — derive the fast/medium/slow variants of every base cell.
// ----------------------------------------------------------------------------
// The 144 baseCells above are the MEDIUM-takeoff anchor. Takeoff's effect is not
// uniform — it depends on which corner of the space we're in, so we classify each
// base scenario and apply a reasoned delta for fast vs. slow. Rationale per corner:
//
//  DOOM   (holds, not aligned, not controlled): an uncontained misaligned ASI wins
//         either way, so takeoff barely moves the near-floor endpoint. Fast → swift,
//         total, slightly less drawn-out suffering; slow → a sliver more warning but
//         more prolonged harm.
//  CONTROL (holds, not aligned, but leashed): takeoff matters MOST here. The leash's
//         robustness tracks how much time control had to mature, and fast takeoff
//         concentrates power abruptly. Fast → brittle leash, power grab; slow →
//         sturdier, more distributed containment.
//  ALIGNED (holds, aligned in time): conditional on success, fast takeoff forces a
//         narrow, concentrated rollout (agency↓); slow lets the solution be verified,
//         broadened and shared (agency↑, flourishing↑).
//  BENIGN  (orthogonality fails): the AI is benign regardless; takeoff sets only how
//         steady the handover is. Fast → abrupt, disorienting (agency↓); slow →
//         gradual and legible.
// ============================================================================
type Corner = 'doom' | 'control' | 'aligned' | 'benign';

function classifyCorner(s: Scenario): Corner {
  if (s.orthogonality === 'fails') return 'benign';
  if (s.alignmentInTime === 'yes') return 'aligned';
  if (s.controlDeployed === 'yes') return 'control';
  return 'doom';
}

// Delta applied to the medium [survival, agency, suffering, flourishing] tuple.
const takeoffDelta: Record<Corner, { fast: ValueTuple; slow: ValueTuple }> = {
  doom:    { fast: [-0.02, 0.0, 0.04, -0.01], slow: [0.03, 0.01, -0.05, 0.02] },
  control: { fast: [-0.18, -0.12, -0.12, -0.12], slow: [0.12, 0.08, 0.1, 0.1] },
  aligned: { fast: [-0.05, -0.12, -0.05, -0.08], slow: [0.04, 0.1, 0.04, 0.08] },
  benign:  { fast: [-0.03, -0.1, -0.05, -0.06], slow: [0.03, 0.08, 0.04, 0.05] },
};

const takeoffClause: Record<Corner, { fast: string; slow: string }> = {
  doom: {
    fast: 'Fast takeoff makes the misaligned takeover swift and total — nothing has time to bite.',
    slow: 'Slow takeoff drags the collapse out: more warning, but more prolonged harm.',
  },
  control: {
    fast: 'Fast takeoff means the leash was improvised under extreme time pressure as capability concentrated abruptly — far more brittle.',
    slow: 'Slow takeoff let control techniques mature and spread before the jump — a sturdier, more distributed leash.',
  },
  aligned: {
    fast: 'Fast takeoff forced the aligned solution to be fielded under pressure by whoever crossed first — narrower and more concentrated.',
    slow: 'Slow takeoff let alignment be verified, broadened and widely shared before the jump.',
  },
  benign: {
    fast: 'Even a benign handover is abrupt under fast takeoff — institutions have no time to adapt.',
    slow: 'Slow takeoff makes the benign handover gradual and legible enough for institutions to absorb.',
  },
};

const clamp1 = (x: number): number => Math.max(-1, Math.min(1, x));

function shiftTuple(base: ValueTuple, delta: ValueTuple): ValueTuple {
  return [clamp1(base[0] + delta[0]), clamp1(base[1] + delta[1]), clamp1(base[2] + delta[2]), clamp1(base[3] + delta[3])];
}

/** Expand one medium-anchor cell into its fast/medium/slow variants. */
function expandTakeoff(base: CachedCell): CachedCell[] {
  const corner = classifyCorner(base.scenario);
  const { survival, agency, suffering, flourishing } = base.outcome.value;
  const medium: ValueTuple = [survival, agency, suffering, flourishing];
  const baseConf = base.outcome.confidence ?? 0.4;
  const derivedConf = Math.max(0.25, baseConf - 0.05); // derived variants are a touch less certain
  const make = (takeoff: string, [s, a, su, f]: ValueTuple, narrative: string, confidence: number): CachedCell => ({
    scenario: { ...base.scenario, takeoff },
    outcome: { narrative, value: { survival: s, agency: a, suffering: su, flourishing: f }, confidence },
  });
  return [
    make('fast', shiftTuple(medium, takeoffDelta[corner].fast), `${base.outcome.narrative} ${takeoffClause[corner].fast}`, derivedConf),
    make('medium', medium, base.outcome.narrative, baseConf),
    make('slow', shiftTuple(medium, takeoffDelta[corner].slow), `${base.outcome.narrative} ${takeoffClause[corner].slow}`, derivedConf),
  ];
}

// Coordination's direct value delta. Its BIG effect is on the ODDS of alignment/control
// (couplings + Bayes net), not on the value of an already-specified world, so the direct
// benefit — collective restraint buying a little survival / suffering-safety — is modest
// and régime-independent.
//
// The AGENCY term, though, is a genuine INTERACTION with power concentration: it's the
// concentration × coordination effect a marginal tornado hides. Who-holds-power is only
// live outside the doom corner (a misaligned takeover moots who held power beforehand):
//   • concentrated + regime → the concentrated power is CHECKED / accountable → agency RECOVERS
//   • concentrated + none   → unchecked concentration (the anchor) — no recovery
//   • diffuse      + regime → a regime centralizes an otherwise distributed world → agency DIPS
// So a governance regime is agency-POSITIVE exactly where power is concentrated (it converts
// lock-in into accountable stewardship) and mildly agency-negative where power is already
// diffuse. This is what makes power concentration *matter conditionally* on governance.
const coordinationBenefit: ValueTuple = [0.06, 0, 0.05, 0.02]; // survival / suffering / flourishing only

function coordinationAgencyShift(corner: Corner, power: string): number {
  if (corner === 'doom') return 0; // who held power is moot once a misaligned ASI takes over
  return power === 'concentrated' ? 0.16 : -0.06;
}

/** Expand one cell into its coordination = {none, regime} variants. */
function expandCoordination(base: CachedCell): CachedCell[] {
  const corner = classifyCorner(base.scenario);
  const power = base.scenario.powerConcentration;
  const { survival, agency, suffering, flourishing } = base.outcome.value;
  const tuple: ValueTuple = [survival, agency, suffering, flourishing];
  const conf = base.outcome.confidence ?? 0.4;
  const regimeDelta: ValueTuple = [
    coordinationBenefit[0],
    coordinationAgencyShift(corner, power),
    coordinationBenefit[2],
    coordinationBenefit[3],
  ];
  const regimeClause =
    corner === 'doom'
      ? 'A standing coordination regime came too late to change a misaligned takeover.'
      : power === 'concentrated'
        ? 'A standing coordination regime makes the concentrated power accountable — collective restraint that checks the lock-in.'
        : 'A standing coordination regime adds collective restraint, at a measure of centralization over an otherwise distributed world.';
  const make = (coordination: string, [s, a, su, f]: ValueTuple, narrative: string): CachedCell => ({
    scenario: { ...base.scenario, coordination },
    outcome: { narrative, value: { survival: s, agency: a, suffering: su, flourishing: f }, confidence: conf },
  });
  return [
    make('none', tuple, base.outcome.narrative),
    make('regime', shiftTuple(tuple, regimeDelta), `${base.outcome.narrative} ${regimeClause}`),
  ];
}

// Deception's effect is the whole point of the factor and is CORNER-DEPENDENT. In a
// CONTROL or a verified-ALIGNED world the defection DOMINATES: once the system defects,
// every prior consideration (the leash, the "alignment," concentration, coordination)
// is void — we're in an uncontained misaligned-ASI takeover, i.e. the DOOM outcome. So
// both deltas are large enough to collapse those worlds to ≈ doom (the clamp floors
// them there). It barely moves an already-DOOMED world and is moot under a BENIGN
// attractor. (Doom itself barely varies with offense/defense or power — the threat is
// from within — so a near-uniform collapse is consistent with the doom narrative.)
const deceptionDelta: Record<Corner, ValueTuple> = {
  doom: [-0.03, 0.0, -0.03, -0.02],
  control: [-1.8, -1.3, -1.0, -1.5],
  aligned: [-1.9, -1.3, -1.3, -1.8],
  benign: [0.0, 0.0, 0.02, 0.0],
};
const deceptionClause: Record<Corner, string> = {
  doom: 'Deceptive alignment barely changes an already-lost world.',
  control: 'And because the system was deceptively aligned, the control regime was watching a mask — the leash slips exactly when it matters, and the contained system escapes.',
  aligned: 'But the alignment was only ever verified against a system that behaves under evaluation — deceptive alignment means we never really had it; it defects once decisively capable.',
  benign: 'Deception is moot: orthogonality fails, so the capable systems are benign rather than scheming.',
};

/** Expand one cell into its deception = {faithful, deceptive} variants. */
function expandDeception(base: CachedCell): CachedCell[] {
  const corner = classifyCorner(base.scenario);
  const { survival, agency, suffering, flourishing } = base.outcome.value;
  const tuple: ValueTuple = [survival, agency, suffering, flourishing];
  const conf = base.outcome.confidence ?? 0.4;
  const make = (deception: string, [s, a, su, f]: ValueTuple, narrative: string): CachedCell => ({
    scenario: { ...base.scenario, deception },
    outcome: { narrative, value: { survival: s, agency: a, suffering: su, flourishing: f }, confidence: conf },
  });
  return [
    make('faithful', tuple, base.outcome.narrative),
    make('deceptive', shiftTuple(tuple, deceptionDelta[corner]), `${base.outcome.narrative} ${deceptionClause[corner]}`),
  ];
}

// The full 1,728-cell space: base × {fast,medium,slow} × {none,regime} × {faithful,deceptive}.
const cachedOutcomes: CachedCell[] = baseCells
  .flatMap(expandTakeoff)
  .flatMap(expandCoordination)
  .flatMap(expandDeception);

// ============================================================================
//  COUPLINGS — dependencies that correct the independence assumption (§9.4).
// ----------------------------------------------------------------------------
// Each coupling multiplies the independent prior of every scenario matching ALL
// its `when` conditions; `analyze` then renormalizes so total mass is preserved.
// Multiplier < 1 suppresses a combination, > 1 boosts it, 0 forbids it. These are
// dependency strengths — argue with them and edit.
// ============================================================================
const couplings: Coupling[] = [
  // --- Takeoff speed ↔ power concentration -------------------------------------
  // A fast (hard) takeoff hands a decisive strategic advantage to whoever crosses
  // first, so capability concentrates almost by definition. Suppress the
  // fast-but-diffuse corner hard; after renormalization P(concentrated | fast)≈0.9.
  {
    id: 'fastTakeoff_concentrates',
    description: 'Fast takeoff ⇒ a decisive first-mover advantage ⇒ power is almost certainly concentrated.',
    when: [{ factor: 'takeoff', state: 'fast' }, { factor: 'powerConcentration', state: 'diffuse' }],
    multiplier: 0.12,
  },
  // A slow takeoff gives trailing actors time to catch up, so diffusion is somewhat
  // more likely than the marginal suggests.
  {
    id: 'slowTakeoff_diffuses',
    description: 'Slow takeoff ⇒ others have time to catch up ⇒ concentration is less likely.',
    when: [{ factor: 'takeoff', state: 'slow' }, { factor: 'powerConcentration', state: 'concentrated' }],
    multiplier: 0.6,
  },
  // A coordination regime governs the frontier — licensing, compute allocation — which
  // tends to concentrate the (now-governable) few; suppress the regime-but-diffuse corner.
  {
    id: 'coordination_concentrates',
    description: 'A coordination regime concentrates the governable frontier ⇒ regime-but-diffuse is less likely.',
    when: [{ factor: 'coordination', state: 'regime' }, { factor: 'powerConcentration', state: 'diffuse' }],
    multiplier: 0.7,
  },

  // --- Takeoff speed ↔ getting alignment / control in time ---------------------
  // "Solved & deployed in time" is a race against the calendar. Fast takeoff shrinks
  // the calendar; slow takeoff lengthens it.
  {
    id: 'fastTakeoff_missesAlignment',
    description: 'Fast takeoff ⇒ far less time to field aligned ASI before catastrophe.',
    when: [{ factor: 'takeoff', state: 'fast' }, { factor: 'alignmentInTime', state: 'yes' }],
    multiplier: 0.5,
  },
  {
    id: 'fastTakeoff_missesControl',
    description: 'Fast takeoff ⇒ less time to stand up and deploy control/monitoring.',
    when: [{ factor: 'takeoff', state: 'fast' }, { factor: 'controlDeployed', state: 'yes' }],
    multiplier: 0.65,
  },
  {
    id: 'slowTakeoff_aidsAlignment',
    description: 'Slow takeoff ⇒ more calendar time, so alignment-in-time is more likely.',
    when: [{ factor: 'takeoff', state: 'slow' }, { factor: 'alignmentInTime', state: 'no' }],
    multiplier: 0.65,
  },

  // --- Orthogonality ↔ alignment tractability ----------------------------------
  // If orthogonality FAILS, sufficiently capable systems converge toward broadly
  // benign goals on their own — so "aligning" them is moot/easy, NOT a hard
  // technical problem. Push tractability toward easy and away from near-impossible.
  // (This encodes the model's current benign-attractor reading of "fails". A
  // malign-attractor variant would instead make tractability near-impossible —
  // flip these two multipliers to model that.)
  {
    id: 'orthogonalityFails_alignmentEasy',
    description: 'Orthogonality fails (benign convergence) ⇒ alignment is effectively a non-problem (easy).',
    when: [{ factor: 'orthogonality', state: 'fails' }, { factor: 'tractability', state: 'easy' }],
    multiplier: 2.2,
  },
  {
    id: 'orthogonalityFails_notNearImpossible',
    description: 'Orthogonality fails ⇒ alignment being near-impossible is incoherent; suppress it.',
    when: [{ factor: 'orthogonality', state: 'fails' }, { factor: 'tractability', state: 'nearImpossible' }],
    multiplier: 0.2,
  },

  // --- Coordination regime ↔ getting alignment / control in time ----------------
  // A coordination regime buys calendar time and standardizes safety, so it raises
  // the odds that alignment and control are actually fielded in time. (This is
  // coordination's main leverage — its direct value effect is small.)
  {
    id: 'coordination_aidsAlignment',
    description: 'A coordination regime buys time and standards ⇒ alignment-in-time is more likely.',
    when: [{ factor: 'coordination', state: 'regime' }, { factor: 'alignmentInTime', state: 'yes' }],
    multiplier: 1.6,
  },
  {
    id: 'coordination_aidsControl',
    description: 'A coordination regime mandates monitoring/control ⇒ control-deployed is more likely.',
    when: [{ factor: 'coordination', state: 'regime' }, { factor: 'controlDeployed', state: 'yes' }],
    multiplier: 1.5,
  },
  {
    id: 'noCoordination_missesAlignment',
    description: 'No coordination ⇒ an uncoordinated race makes alignment-in-time less likely.',
    when: [{ factor: 'coordination', state: 'none' }, { factor: 'alignmentInTime', state: 'yes' }],
    multiplier: 0.8,
  },

  // --- Orthogonality ↔ deceptive alignment -------------------------------------
  // If misalignment is the default (orthogonality holds), deceptive alignment is the
  // natural failure mode; if orthogonality fails (benign convergence), systematic
  // scheming is much less likely.
  {
    id: 'orthogonalityHolds_deceptive',
    description: 'Orthogonality holds ⇒ deceptive alignment is the likely failure mode.',
    when: [{ factor: 'orthogonality', state: 'holds' }, { factor: 'deception', state: 'deceptive' }],
    multiplier: 1.25,
  },
  {
    id: 'orthogonalityFails_faithful',
    description: 'Orthogonality fails (benign convergence) ⇒ systematic deception is unlikely.',
    when: [{ factor: 'orthogonality', state: 'fails' }, { factor: 'deception', state: 'deceptive' }],
    multiplier: 0.5,
  },
];

// ============================================================================
//  BAYES NET — the principled successor to independence×couplings (DESIGN §9.4,
//  docs/MODEL.md §5). A DAG over the factors with a CPT per node defines the joint
//  exactly: P(scenario) = ∏ P(state | parents). Root nodes (the objective facts plus
//  takeoff) read their prior live from the sliders; child nodes are conditioned on
//  their parents. These CPTs are authored estimates — argue with them and edit. The
//  edges mirror the couplings above: takeoff drives concentration and the "in time"
//  factors; orthogonality drives tractability.
//
//  This is OPT-IN: `analyze` still uses independence×couplings by default. The net is
//  validated and ready to wire in as a selectable probability model (see MODEL.md §5
//  for what remains — the UI toggle and the child-slider semantics).
// ============================================================================
// Base P(yes) for the "solved in time" factors before the coordination modifier.
const alignBaseYes: Record<string, number> = {
  'fast|easy': 0.4, 'fast|hard': 0.2, 'fast|nearImpossible': 0.05,
  'medium|easy': 0.6, 'medium|hard': 0.35, 'medium|nearImpossible': 0.1,
  'slow|easy': 0.8, 'slow|hard': 0.55, 'slow|nearImpossible': 0.2,
};
const controlBaseYes: Record<string, number> = { fast: 0.3, medium: 0.5, slow: 0.65 };

// Fold a coordination modifier into a binary "yes/no" CPT: a regime scales the odds
// of "yes" up, no coordination scales them down. The parent key gains a trailing
// `|regime` / `|none` segment (coordination is the last parent).
const clampP = (p: number): number => Math.max(0.02, Math.min(0.98, p));
function withCoordination(baseYes: Record<string, number>): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const base of Object.keys(baseYes)) {
    for (const coord of ['regime', 'none'] as const) {
      const p = clampP(baseYes[base] * (coord === 'regime' ? 1.5 : 0.75));
      out[`${base}|${coord}`] = { yes: p, no: 1 - p };
    }
  }
  return out;
}

// P(concentrated | takeoff), before coordination. Fast takeoff concentrates.
const concentratedBase: Record<string, number> = { fast: 0.9, medium: 0.55, slow: 0.35 };
// Coordination shapes concentration too: a governance regime tends to concentrate the
// (now-governable) frontier — licensing, compute allocation — while an uncoordinated
// world leaves it a touch more diffuse. Parent order is (takeoff, coordination).
function concentrationCpt(base: Record<string, number>): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const t of Object.keys(base)) {
    for (const coord of ['regime', 'none'] as const) {
      const p = clampP(base[t] * (coord === 'regime' ? 1.15 : 0.92));
      out[`${t}|${coord}`] = { concentrated: p, diffuse: 1 - p };
    }
  }
  return out;
}

const bayesNet: BayesNet = {
  description:
    'DAG: objective facts, takeoff, coordination, and deceptive alignment are roots (priors from your sliders); tractability depends on orthogonality; power concentration depends on takeoff and coordination (a governance regime concentrates the governable frontier); and the “solved in time” factors depend on takeoff, tractability, and whether a coordination regime is in place. Deception is the lever that decides whether a deployed control regime can actually be trusted.',
  nodes: [
    // --- roots: priors read live from credences (no CPT) -----------------------
    { factor: 'orthogonality', parents: [], note: 'Root: a structural fact; prior from your slider.' },
    { factor: 'offenseDefense', parents: [], note: 'Root: a structural fact; prior from your slider.' },
    { factor: 'takeoff', parents: [], note: 'Root: treated as exogenous; prior from your slider.' },
    { factor: 'coordination', parents: [], note: 'Root: our collective choice; prior from your slider. Buys time for alignment & control.' },
    { factor: 'deception', parents: [], note: 'Root: a structural fact about how training scales; prior from your slider. Decides whether deployed control can be trusted.' },

    // --- tractability | orthogonality -----------------------------------------
    {
      factor: 'tractability',
      parents: ['orthogonality'],
      note: 'If orthogonality fails (benign convergence), alignment is effectively a non-problem, so tractability skews easy.',
      cpt: {
        holds: { easy: 0.2, hard: 0.5, nearImpossible: 0.3 },
        fails: { easy: 0.6, hard: 0.3, nearImpossible: 0.1 },
      },
    },

    // --- powerConcentration | (takeoff, coordination) -------------------------
    {
      factor: 'powerConcentration',
      parents: ['takeoff', 'coordination'],
      note: 'A fast takeoff hands a decisive first-mover advantage, so capability concentrates; a slow one lets others catch up. A coordination regime also concentrates the (now-governable) frontier — licensing, compute allocation — while an uncoordinated world stays a touch more diffuse.',
      cpt: concentrationCpt(concentratedBase),
    },

    // --- alignmentInTime | (takeoff, tractability, coordination) --------------
    {
      factor: 'alignmentInTime',
      parents: ['takeoff', 'tractability', 'coordination'],
      note: 'A race against the calendar (takeoff) gated by problem difficulty (tractability); a coordination regime buys time and standards, raising the odds.',
      cpt: withCoordination(alignBaseYes),
    },

    // --- controlDeployed | (takeoff, coordination) ----------------------------
    {
      factor: 'controlDeployed',
      parents: ['takeoff', 'coordination'],
      note: 'Standing up and deploying control/monitoring takes calendar time; a coordination regime mandates and accelerates it.',
      cpt: withCoordination(controlBaseYes),
    },
  ],
};

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
      'International coordination on frontier compute. Pushes toward a coordination regime — which buys time for alignment and control (via the couplings / Bayes net) — and tilts toward a more concentrated, governable frontier.',
    deltas: [
      { factor: 'coordination', towardState: 'regime', magnitude: 0.2 },
      { factor: 'powerConcentration', towardState: 'concentrated', magnitude: 0.08 },
    ],
  },
  {
    id: 'openFrontier',
    label: 'Broaden frontier access (open-source / antitrust)',
    description:
      'Open weights, antitrust, and broad compute access push capability toward a diffuse, many-hands frontier — trading the governability of a concentrated frontier for distributed agency and resistance to lock-in. The opposite lever, concentrating the governable frontier, rides along with a coordination regime (see compute-governance).',
    deltas: [{ factor: 'powerConcentration', towardState: 'diffuse', magnitude: 0.15 }],
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
  couplings,
  bayesNet,
  baselineCredences,
  defaultWeights,
  linearBaseline,
  linearContributions,
  cachedOutcomes,
};
