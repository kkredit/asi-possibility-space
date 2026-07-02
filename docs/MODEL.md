# The mathematical model

This note describes what the tool is actually computing, and what we've learned
about the *shape* of the AI-safety possibility space by fitting several models to
the hand-reasoned outcomes. It is the conceptual companion to
[`DESIGN.md`](DESIGN.md) (which fixes the *content*) and to the engine code in
[`src/engine/`](../src/engine).

> **Status:** the findings below are computed from the **presumed first-pass**
> dataset in [`src/model/dataset.ts`](../src/model/dataset.ts). The *method* is the
> durable contribution; the specific residual numbers move whenever the
> hand-reasoned cells are re-authored. Re-run `pnpm test` — the model-ladder
> assertions in [`fit.test.ts`](../src/engine/fit.test.ts) pin the ordering.

---

## 1. There are two models, not one

A "future" is a scenario `s` — one state assigned to every factor. Everything the
tool surfaces is built from two independent functions over scenarios:

| | Question | Maps | Current implementation | Upgrade path |
|---|---|---|---|---|
| **Probability model** | How likely is this world? | `s → P(s)` | independence × couplings (§4) | **Bayes net** (§5) |
| **Value model** | How good is this world? | `s → V(s)` (a value vector) | the **evaluators** (§2–3) | richer evaluators |

The headline `EV = Σ_s P(s)·scalarize(V(s), weights)` multiplies them. They are
genuinely separate concerns and improve on separate axes — conflating them is the
most common way to muddle the analysis. **Bayes nets belong to the probability
model; evaluators belong to the value model.** They are not alternatives to each
other.

---

## 2. The value model is a *family* of evaluators

An evaluator maps a scenario to an outcome `{ narrative, value }`. We ship five,
spanning two model families, and the whole point is to **compare** them — their
divergence from the hand-reasoned surface is the research signal.

**Additive family** — `V(s) = baseline + Σ contributions`:
- **`linear`** — hand-set coefficients. Deliberately crude, and so poor it's no longer
  offered in the picker — it survives only as the internal fallback for un-authored
  cells. Still shown below as the analytical "before fitting" baseline.
- **`fitted`** — the *same additive form*, but coefficients solved by least squares
  against the hand-reasoned cells (ridge-regularised, [`fit.ts`](../src/engine/fit.ts)).
- **`fitted + pairwise`** — adds an indicator for every pair of factor-states, so it
  can represent any two-way interaction.

**Gating family** — `V(s) = f(logical classification of s)`:
- **`archetype` ("Logical gates")** — classify `s` into one of eight régimes by
  hard logical gates (the four archetypes × deceptive/faithful), predict that
  régime's mean value. Eight buckets, thirty-two data-derived numbers, zero
  hand-tuning.

**Reference:**
- **`cached`** — the hand-reasoned surface itself, authored one scenario at a time.
  Every other model is measured against it.

---

## 3. The model ladder — what we learned

Fit each model to the same hand-reasoned cells and measure the **RMS divergence**
from cached over all 1,728 scenarios, in value-vector space (each dimension is in
`[-1, 1]`, so the RMS is in value-units and weight-independent):

| Model | Free params | RMS to cached | What its residual *is* |
|---|---:|---:|---|
| `linear` (hand-set)¹ | 22 | **0.533** | bad coefficients **+** non-linearity (conflated) |
| `fitted` (additive) | 22 | **0.310** | **irreducible non-linearity** — what no sum-of-factors can express |
| `archetype` (8 régimes) | 32 | **0.182** | structure beyond an 8-way logical split |
| `fitted + pairwise` | 217 | **0.141** | genuinely **higher-than-pairwise** (3-way+) entanglement |
| `cached` | — | 0 | (the reference) |

¹ `linear` is the analytical baseline only; it's not selectable in the UI ladder (it
was too crude to be worth picking) — the picker shows `fitted`, `archetype`, and
`fitted + pairwise` against `cached`.

Three things fall out of this ladder:

1. **About 40% of the hand-set model's error was just bad coefficients.**
   `linear → fitted` drops the RMS from 0.533 to 0.308 with no change in form. So
   when you look at the cached-vs-linear scatter, much of the spread is *not*
   evidence of non-linearity — it's the hand-picked numbers being suboptimal. The
   fitted model is the honest foil.

2. **The space is substantially non-linear, and most of that is pairwise.** The
   best possible additive model still sits 0.308 from cached; adding two-way terms
   more than halves that (to 0.141). Survival, agency and the rest really do depend
   on *combinations* of factors, not a sum of independent pulls.

3. **The space is fundamentally *gated*, not additive — across eight régimes.**
   The `archetype` model (0.182, just 32 data-derived numbers) decisively beats the
   best 22-parameter additive model (0.310) and gets most of the way to the
   217-parameter pairwise fit (0.141). It works by classifying each scenario into one
   of **eight logical régimes** — the four archetypes (benign / aligned / control /
   doom) each split by whether **deception** holds — and predicting that régime's mean.
   *Which régime you're in* dominates *how much each factor adds*. Deception earns its
   place here: when it was first added but the archetype still used only four buckets,
   its lead collapsed to a hair (0.300 vs 0.308), because deception's large swing (it
   guts a CONTROL world, falsifies an ALIGNED one) landed as within-bucket residual;
   splitting the buckets on deception (4 → 8) recovered it. Part of the *remaining*
   residual is deliberate interaction: **power concentration × coordination** — a
   governance regime makes concentrated power accountable (agency recovers) but mildly
   centralizes an already-diffuse world (agency dips), so its agency effect flips sign
   on the power state. That's exactly the kind of two-way term the additive models can't
   see and the pairwise fit can.

### The gates

The `archetype` evaluator reads four factors and ignores the rest — three set the
archetype, and deception splits each archetype in two:

```
BENIGN   orthogonality fails                        → capable systems are benign anyway
ALIGNED  holds ∧ alignment-in-time = yes            → we fielded aligned ASI
CONTROL  holds ∧ ¬aligned ∧ control deployed        → misaligned but leashed
DOOM     holds ∧ ¬aligned ∧ ¬control                → uncontained misaligned ASI
         × { deceptive | faithful }                 → does the leash / verification hold?
```

This mirrors the structure the hand-reasoning already used (the
`DOOM`/`CONTROL`/`ALIGNED`/`BENIGN` sub-arguments documented in `dataset.ts`). The
fact that *recovering it statistically* outperforms additive fitting is the model
confirming the narrative's own logic.

### What this means for the tool

- The `fitted` evaluator is the right **null model**: divergence from *it* (not from
  hand-`linear`) is real non-linearity worth investigating.
- The `archetype` residual (0.182) localises *within-régime* variation — once you
  know the gate (including deception), what's left is the secondary modulation
  (offense/defense balance, power concentration, takeoff, coordination) the means
  average over. Those are the cells most worth re-reasoning carefully.
- The next evaluator worth building is a **gated-additive hybrid**: classify by the
  eight régimes, then fit a small additive model *within* each. It should close the
  remaining gap to the pairwise fit with a fraction of the parameters, and would be
  both accurate and interpretable.

---

## 4. The probability model today: independence × couplings

The base model assumes factors are independent: `P(s) = ∏_f credence[f, s_f]`.
That's wrong in known ways (a fast takeoff makes diffuse power and alignment-in-time
much less likely), so we apply **couplings**: a log-linear correction where every
scenario matching a coupling's `when` conditions has its prior multiplied, after
which the whole distribution is renormalised so total mass is preserved (couplings
only *redistribute* probability). See [`scenarios.ts`](../src/engine/scenarios.ts)
and [`analyze.ts`](../src/engine/analyze.ts).

Couplings are a pragmatic, sparse, **pairwise** dependency model. They are easy to
author and audit, but they are not a coherent joint distribution: stacked
multipliers on overlapping conditions have no principled interpretation, and there
is no notion of conditional independence structure.

---

## 5. The probability-model upgrade path: a Bayes net

A Bayes net is the principled version of what couplings approximate. It is a
**directed acyclic graph** over the factors plus a **conditional probability table
(CPT)** at each node, and it defines the joint exactly:

```
P(s) = ∏_f  P(s_f | parents(f))
```

**This is now implemented (opt-in).** The DAG and CPTs ship in the dataset
(`bayesNet` in [`dataset.ts`](../src/model/dataset.ts)); the engine is in
[`bayesnet.ts`](../src/engine/bayesnet.ts) and `analyze` takes an optional `net`
argument that swaps the joint over to it. The implemented graph:

```
  roots (priors from your sliders): orthogonality  offenseDefense  takeoff   coordination
                                          │                          │  │          │
                                          ▼              ┌───────────┘  │          │
                                     tractability ───┐   │              ▼          │
                                          │          │   ├──► powerConcentration ◄──┤
                                          │          ▼   ▼                          │
                                          └────► alignmentInTime ◄── coordination   │
                                                        controlDeployed ◄── takeoff ┘
```

i.e. **takeoff** drives power concentration, alignment-in-time, and control-deployed;
**coordination** also shapes power concentration (a governance regime concentrates the
governable frontier) and buys time for alignment/control; **orthogonality** drives
tractability, which also gates alignment-in-time. The roots (orthogonality, offense/
defense, takeoff, coordination, deception) read their priors **live from the sliders**;
the child factors are set by CPTs conditioned on their parents. The CPTs mirror the
couplings (e.g. `P(concentrated | fast) = 0.9`).

**It validates as a faithful refinement, not a different universe.** The net's joint
sums to 1; its root marginals reproduce the sliders exactly; its child marginals stay
in the baseline ballpark but are now *derived* (tractability skews easier because
orthogonality-fails implies easy). At baseline beliefs the headline EV is **0.113**
under the net vs. **0.116** under independence×couplings — a small, explainable shift.
`validateBayesNet` checks acyclicity and CPT completeness/normalisation;
[`bayesnet.test.ts`](../src/engine/bayesnet.test.ts) pins all of this.

**The child-slider question is resolved — soft evidence by raking.** A probability-
model toggle ships in the Beliefs panel (independence×couplings ↔ Bayes net). In
net mode every slider is a *target marginal*: drag one and it's **HELD** while the
untouched (**FLOAT**) factors re-rake to stay consistent with the net's relationships,
via Iterative Proportional Fitting ([`softevidence.ts`](../src/engine/softevidence.ts)).
The net's CPTs supply the associations; your touched sliders supply the marginals; IPF
returns the minimum-KL joint matching both. Sliding alignment-in-time up raises slow
takeoff and easy tractability — evidence flows to the parents. The reconciled joint
drives every tab (EV, Landscape, sensitivity, Conditions) via `analyze`'s
`jointProbability` override; actions re-rake (an action asserts a higher target on its
factor and the effect propagates through the net).

The **DAG is now viewable in the UI** — "View the network ↗" next to the
probability-model selector opens a layered diagram of the net
([`BayesNetDiagram`](../src/viz/BayesNetDiagram.tsx)), roots on top, arrows
parent → child, nodes colored by kind with the dependency rationale on hover.

**What still remains:**
- **Pin semantics.** `analyze`'s probabilities sum to the pinned mass `P(pins)` (EV
  under pins is mass-weighted, not conditional). The net path mirrors this exactly; if
  we want true conditional EVs under pins, that normalisation choice should be made for
  *both* models together.
- The `Coupling` type can eventually be retired (or kept as compile-to-CPT sugar).

---

## 6. Where the value of this framing lands

The two-model split tells you which lever to pull when the EV "feels wrong":

- **The ranking of futures is wrong** → it's the **value model**. Switch to `fitted`
  to rule out bad coefficients; if the `archetype` and `cached` models disagree with
  it sharply on a high-probability cell, re-reason that cell.
- **The *weight* on futures is wrong** → it's the **probability model**. Check the
  couplings (or, eventually, the Bayes-net CPTs); a surprising EV often traces to an
  unconstrained corner getting too much mass.

Keeping these separate is what lets the sensitivity tornado mean something: it
varies `P` (pinning factors) while holding `V` fixed, so a big swing is always
attributable to one side of the model.
