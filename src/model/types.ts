// The data store's type vocabulary. Pure types — no logic, no React.

/**
 * Three kinds of input. What a credence slider MEANS depends on the kind:
 *  - for OBJECTIVE factors it's your confidence, right now, that a timeless,
 *    structural property holds — true the same way in this universe and any other;
 *  - for everything else it's a FORECAST of the factor's state *at ASI onset* — the
 *    threshold where value locks in — because those variables are still in motion
 *    until then.
 *
 * The kind also fixes whether you can act on a factor and, when you can't, how you
 * reduce your uncertainty:
 *
 *  - objective:     a structural fact (the mathematics of intelligence, the physics
 *                   of ASI conflict). Off the leverage axis entirely — unmovable in
 *                   any universe; you only DISCOVER which way it is, by research.
 *                   High EV-sensitivity => value of information.
 *  - contingent:    a feature of the ASI-onset world we have LITTLE leverage over —
 *                   its trajectory is driven mostly by exogenous forces (geopolitics,
 *                   markets, who races whom). You mainly forecast it and position for
 *                   it; actions may nudge it, but weakly. High sensitivity =>
 *                   situational awareness.
 *  - influenceable: a feature of the ASI-onset world our choices have SUBSTANTIAL
 *                   leverage over. High sensitivity => act.
 *
 * Contingent and influenceable are the SAME kind of thing — forecasts of the world
 * at the threshold — and differ only in how much grip we have on them. The line
 * between them is *leverage*, a continuum, not a hard either/or; a factor is
 * `influenceable` when our choices dominate its outcome and `contingent` when
 * exogenous forces do. Objective is the genuinely distinct kind: a timeless fact,
 * never a forecast.
 */
export const FACTOR_KINDS = ['objective', 'contingent', 'influenceable'] as const;
export type FactorKind = (typeof FACTOR_KINDS)[number];

export type FactorId = string;
export type StateId = string;

export interface FactorState {
  id: StateId;
  label: string;
  /** Author's note on what this state means. */
  blurb?: string;
}

export interface Factor {
  id: FactorId;
  label: string;
  kind: FactorKind;
  /** The question this factor poses. */
  question: string;
  /** Short description of the debate / what's at stake. */
  description: string;
  /** Mutually exclusive states. Hard cap of 3 (keeps the scenario space cacheable). */
  states: FactorState[];
  /** Deeper scholarly background + linked reading, surfaced in the "learn more" modal. */
  background?: FactorBackground;
}

/** What kind of resource a reference is, so the UI can badge accessibility. */
export type FactorReferenceKind =
  | 'paper' // academic paper / technical report
  | 'book' // book (link is usually a stable overview page)
  | 'post' // blog post / essay / forum write-up
  | 'video' // talk or explainer video
  | 'podcast' // podcast episode / interview
  | 'course'; // curated course / reading list

/** A prominent work relating to a factor — the "launchpad" links. */
export interface FactorReference {
  label: string;
  url: string;
  kind: FactorReferenceKind;
  /** One line on what it argues / why it's worth reading. */
  note?: string;
}

/** A named stance in the factor's debate — the spectrum of expert views. */
export interface FactorPosition {
  /** Short name for the camp/view (e.g. "Orthogonalist"). */
  name: string;
  /** Who holds it / what it claims, one line. */
  stance: string;
  /** Which of this factor's states this position corresponds to, if any. */
  state?: StateId;
}

/**
 * The deeper treatment of a factor for the "learn more" modal: a few paragraphs of
 * scholarly context, the named positions in the debate, and linked works ranging
 * from accessible (podcasts, blog posts, videos) to primary (papers, books).
 */
export interface FactorBackground {
  /** The debate in depth — one string per paragraph. */
  paragraphs: string[];
  /** The spectrum of expert views. */
  positions?: FactorPosition[];
  /** Prominent works — accessible entry points first, then primary sources. */
  references: FactorReference[];
}

/** The value dimensions an outcome is scored on. */
export type ValueDimensionId = 'survival' | 'agency' | 'suffering' | 'flourishing';

export interface ValueDimension {
  id: ValueDimensionId;
  label: string;
  /** What -1 means / what +1 means, for axis labels & tooltips. */
  lowLabel: string;
  highLabel: string;
}

/** A score in [-1, +1] on each value dimension. */
export type ValueVector = Record<ValueDimensionId, number>;

/** One assignment of a state to every (active) factor — a complete possible world. */
export type Scenario = Record<FactorId, StateId>;

export interface Outcome {
  /** Narrative description of this future. */
  narrative: string;
  value: ValueVector;
  /** Author confidence in this hand-reasoned cell, 0..1 (cached evaluator only). */
  confidence?: number;
}

/**
 * Maps a scenario to an outcome. `undefined` means "this evaluator has no opinion
 * on this cell" (the cached evaluator returns undefined for un-authored cells).
 */
export interface Evaluator {
  id: string;
  label: string;
  description: string;
  evaluate(scenario: Scenario, dataset: Dataset): Outcome | undefined;
}

/**
 * A dependency between factors that corrects the independence assumption.
 *
 * Under independence the joint probability of a scenario is just the product of
 * each factor's marginal credence. A coupling is a log-linear correction: every
 * scenario that matches ALL of `when`'s (factor=state) conditions has its prior
 * multiplied by `multiplier` (>1 boosts that combination, <1 suppresses it, 0
 * forbids it). After every coupling has applied, the joint is renormalized so the
 * total probability mass is unchanged — couplings only *redistribute* mass.
 *
 * Example: takeoff=fast strongly implies powerConcentration=concentrated, so the
 * (fast, diffuse) combination carries a multiplier well below 1.
 */
export interface Coupling {
  id: string;
  /** Human-readable rationale for the dependency. */
  description: string;
  /** All these (factor=state) must hold for the multiplier to apply. */
  when: { factor: FactorId; state: StateId }[];
  /** Prior multiplier applied to matching scenarios. */
  multiplier: number;
}

/**
 * One node of a Bayes net over the factors: a factor plus its parents and a
 * conditional probability table. The net is the principled successor to the
 * independence-plus-`Coupling` probability model (see docs/MODEL.md §5): it defines
 * the joint exactly as `P(scenario) = ∏_f P(state_f | parents(f))`.
 *
 * The `cpt` maps each combination of parent states to a distribution over THIS
 * factor's states. The key is the parents' state ids joined by '|' in `parents`
 * order (e.g. parents `['takeoff','tractability']` → key `'fast|hard'`). A root node
 * (no parents) omits the table: its prior is read live from the user's credences, so
 * the sliders on root factors stay meaningful (they ARE the root priors).
 */
export interface BayesNetNode {
  factor: FactorId;
  parents: FactorId[];
  /** Distribution over this factor's states per parent-state combination. Omitted
   *  (or empty) for roots, whose prior comes from the current credences. */
  cpt?: Record<string, Record<StateId, number>>;
  /** Human-readable rationale for this node's dependence on its parents. */
  note?: string;
}

export interface BayesNet {
  description: string;
  nodes: BayesNetNode[];
}

/** A single nudge: shift probability mass of `factor` toward `towardState`. */
export interface ActionDelta {
  factor: FactorId;
  towardState: StateId;
  /** Absolute probability shift in [0,1] applied to the target state. */
  magnitude: number;
}

/** A nudge on a SUBFACTOR's credences (used when the sub-layer is active). */
export interface ActionSubDelta {
  subfactor: SubfactorId;
  towardState: StateId;
  magnitude: number;
}

export interface Action {
  id: string;
  label: string;
  description: string;
  /** Direct factor nudges. For sub-layer actions these are the FALLBACK used when
   *  the parent factor is set directly (sub-layer detached). */
  deltas: ActionDelta[];
  /** Sub-layer nudges; applied (and the parent re-derived) when the sub-layer is
   *  active. Takes precedence over `deltas` for the derived parents. */
  subDeltas?: ActionSubDelta[];
}

/** Baseline credences: per factor, a probability for each state (sums to 1). */
export type Credences = Record<FactorId, Record<StateId, number>>;

// ---------------------------------------------------------------------------
// Subfactors — the belief-layer deep dive under a parent factor.
// ---------------------------------------------------------------------------

export type SubfactorId = string;

/**
 * A belief-layer refinement of one parent factor. Subfactors carry sliders,
 * backgrounds, preset credences, and actions exactly like factors, but they do
 * NOT enter the scenario space — instead a `Derivation` computes the parent
 * factor's credences from the sub-beliefs, so the enumerated space stays small.
 */
export interface Subfactor {
  id: SubfactorId;
  /** The factor whose credences this subfactor helps derive. */
  parent: FactorId;
  label: string;
  kind: FactorKind;
  question: string;
  description: string;
  states: FactorState[];
  /** Which objective belief gates this research area's payoff (display hint). */
  gatedBy?: SubfactorId | FactorId;
  background?: FactorBackground;
}

/** Per-subfactor credences (each subfactor's states sum to 1). */
export type SubCredences = Record<SubfactorId, Record<StateId, number>>;

/**
 * How a parent factor's credences are derived from sub-beliefs.
 *
 *  - `cpt`: P(parent-state | sub-state combo) marginalized over the sub-credences
 *    (keys are sub-states joined by '|' in `parents` order, like Bayes-net CPTs).
 *  - `gatedOdds`: binary parent; odds(yes) = baseOdds × ∏ E[term multiplier],
 *    where each term's multiplier depends on a research area's state AND its
 *    objective gate's state (key `"areaState|gateState"`), expectation taken
 *    over the current sub- (and, for factor gates, main) credences.
 */
export type Derivation =
  | {
      kind: 'cpt';
      factor: FactorId;
      parents: SubfactorId[];
      cpt: Record<string, Record<StateId, number>>;
    }
  | {
      kind: 'gatedOdds';
      factor: FactorId;
      yesState: StateId;
      noState: StateId;
      baseOdds: number;
      terms: {
        area: SubfactorId;
        /** The gate belief: a subfactor id, or (with gateIsFactor) a main factor id. */
        gate: SubfactorId | FactorId;
        gateIsFactor?: boolean;
        multipliers: Record<string, number>;
      }[];
      /** Plain per-factor odds modifiers (expectation over that factor's credences).
       *  Evaluated against the partially-derived credences, so an earlier derivation
       *  in the list (e.g. tractability) feeds a later one (alignment-in-time). */
      modifiers?: { factor: FactorId; multipliers: Record<StateId, number> }[];
    };

/** Per-factor-state-dimension additive contributions for the linear evaluator. */
export type LinearContributions = Record<
  FactorId,
  Record<StateId, Partial<ValueVector>>
>;

/** A hand-reasoned scenario cell for the cached evaluator. */
export interface CachedCell {
  scenario: Scenario;
  outcome: Outcome;
}

/** A numbered public source backing a preset; referenced by index from factors. */
export interface PresetReference {
  label: string;
  url: string;
  /** Verbatim quote from the source, if pulled. */
  quote?: string;
}

/**
 * How a single factor's credence was set for a preset: a short rationale, a
 * per-factor `accuracy` (how directly the public record pins THIS factor for THIS
 * entity, 0–1), and `refs` — 1-based indices into the preset's `references` list
 * (rendered as superscripts). There is intentionally NO overall accuracy: fidelity
 * varies factor-by-factor, so it's reported per factor.
 */
export interface PresetFactorView {
  /** Rationale for this factor's credence, ideally echoing a cited statement. */
  note: string;
  /** How directly the public record pins this factor, 0–1. */
  accuracy: number;
  /** 1-based reference numbers (into `references`) backing this factor. */
  refs?: number[];
}

/**
 * A belief preset reflecting a public figure's or organization's stated views,
 * grounded in cited public statements. Fidelity is reported PER FACTOR
 * (`factors[id].accuracy` + `refs`), not as a single overall number.
 */
export interface Preset {
  id: string;
  /** For `person`, the individual's name; for `lab`, the organization's name. */
  name: string;
  /** Whether this preset represents an individual's personal views or an org's institutional position. */
  category: 'person' | 'lab';
  /** Shown in parens after the name: for individuals their org/venue (e.g. "MIRI");
   *  for labs their head/CEO (e.g. "Sam Altman"). */
  affiliation?: string;
  /** Fuller affiliation / role line shown in the detail card. */
  role: string;
  /** One-line characterization of their view. */
  summary: string;
  credences: Credences;
  /** Credences over the belief-layer subfactors (the alignment deep dive). */
  subCredences?: SubCredences;
  /** Optional value-weight override; falls back to the dataset default. */
  weights?: ValueVector;
  /** Their stated p(doom)/p(catastrophe) as a display string, if on record. */
  pdoom?: string;
  /** How the modeled numbers were derived and why the model-implied doom/EV may
   *  differ from the stated view — the sources-and-reasoning reconciliation note. */
  reconciliation?: string;
  /** Per-factor rationale, accuracy, and supporting reference indices. */
  factors: Partial<Record<FactorId, PresetFactorView>>;
  /** The entity's numbered reference list; `factors[id].refs` index into it (1-based). */
  references: PresetReference[];
}

export interface Dataset {
  name: string;
  factors: Factor[];
  /** Belief-layer subfactors (deep dives under a parent factor); optional. */
  subfactors?: Subfactor[];
  /** How the derived parents' credences are computed from sub-beliefs. */
  derivations?: Derivation[];
  /** Default sub-credences (calibrated so derived parents ≈ baselineCredences). */
  subBaseline?: SubCredences;
  valueDimensions: ValueDimension[];
  actions: Action[];
  /** Dependencies between factors; corrects the independence assumption. */
  couplings: Coupling[];
  /** Optional Bayes net — the principled alternative to independence×couplings as
   *  the probability model. When present, `analyze` can use it instead. */
  bayesNet?: BayesNet;
  /** Default credences (the starting odds). */
  baselineCredences: Credences;
  /** Default value-dimension weights (sum normalized at use). */
  defaultWeights: ValueVector;
  /** Linear evaluator content. */
  linearBaseline: ValueVector;
  linearContributions: LinearContributions;
  /** Sparse hand-reasoned cells. Un-listed scenarios fall back to the linear evaluator. */
  cachedOutcomes: CachedCell[];
}
