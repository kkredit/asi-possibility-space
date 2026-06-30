// The data store's type vocabulary. Pure types — no logic, no React.

/**
 * Three fundamentally different kinds of input. This distinction is the spine of
 * the tool: it determines whether and how you can act on a factor.
 *  - objective:     a fact about reality. You can only revise your credence.
 *                   High EV-sensitivity here => high value of information.
 *  - contingent:    a fact about the situation we're in. ~Fixed; track it.
 *  - influenceable: something choices can move. Actions attach here.
 */
export type FactorKind = 'objective' | 'contingent' | 'influenceable';

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

/** A single nudge: shift probability mass of `factor` toward `towardState`. */
export interface ActionDelta {
  factor: FactorId;
  towardState: StateId;
  /** Absolute probability shift in [0,1] applied to the target state. */
  magnitude: number;
}

export interface Action {
  id: string;
  label: string;
  description: string;
  deltas: ActionDelta[];
}

/** Baseline credences: per factor, a probability for each state (sums to 1). */
export type Credences = Record<FactorId, Record<StateId, number>>;

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

/** A linked public statement backing a preset. */
export interface PresetCitation {
  label: string;
  url: string;
  /** Verbatim quote from the source, if pulled. */
  quote?: string;
}

/**
 * A belief preset reflecting a public figure's or organization's stated views,
 * grounded in cited public statements. `accuracy` is how directly the public
 * record pins these specific factors: ~1.0 when they give explicit probabilities
 * for each category, low when the mapping is inferred from general statements.
 */
export interface Preset {
  id: string;
  /** For `person`, the individual's name; for `lab`, the organization's name. */
  name: string;
  /** Whether this preset represents an individual's personal views or an org's institutional position. */
  category: 'person' | 'lab';
  /** For individuals: the org/venue shown in parens after the name (e.g. "MIRI"). Omitted for orgs. */
  affiliation?: string;
  /** Fuller affiliation / role line shown in the detail card. */
  role: string;
  /** One-line characterization of their view. */
  summary: string;
  credences: Credences;
  /** Optional value-weight override; falls back to the dataset default. */
  weights?: ValueVector;
  /** Estimated fidelity of this mapping, 0–1. */
  accuracy: number;
  accuracyNote: string;
  /** Their stated p(doom)/p(catastrophe) as a display string, if on record. */
  pdoom?: string;
  /** Per-factor rationale / quote behind the numbers. */
  factorNotes?: Partial<Record<FactorId, string>>;
  citations: PresetCitation[];
}

export interface Dataset {
  name: string;
  factors: Factor[];
  valueDimensions: ValueDimension[];
  actions: Action[];
  /** Dependencies between factors; corrects the independence assumption. */
  couplings: Coupling[];
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
