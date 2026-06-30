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
- **`linear`** — hand-set coefficients. Deliberately crude.
- **`fitted`** — the *same additive form*, but coefficients solved by least squares
  against the hand-reasoned cells (ridge-regularised, [`fit.ts`](../src/engine/fit.ts)).
- **`fitted + pairwise`** — adds an indicator for every pair of factor-states, so it
  can represent any two-way interaction.

**Gating family** — `V(s) = f(logical classification of s)`:
- **`archetype` ("Logical gates")** — classify `s` into one of four archetypes by
  hard logical gates, predict that archetype's mean value. Four buckets, sixteen
  data-derived numbers, zero hand-tuning.

**Reference:**
- **`cached`** — the hand-reasoned surface itself, authored one scenario at a time.
  Every other model is measured against it.

---

## 3. The model ladder — what we learned

Fit each model to the same hand-reasoned cells and measure the **RMS divergence**
from cached over all 432 scenarios, in value-vector space (each dimension is in
`[-1, 1]`, so the RMS is in value-units and weight-independent):

| Model | Free params | RMS to cached | What its residual *is* |
|---|---:|---:|---|
| `linear` (hand-set) | 18 | **0.528** | bad coefficients **+** non-linearity (conflated) |
| `fitted` (additive) | 18 | **0.330** | **irreducible non-linearity** — what no sum-of-factors can express |
| `archetype` (4 gates) | 16 | **0.208** | structure beyond a 4-way logical split |
| `fitted + pairwise` | 141 | **0.149** | genuinely **higher-than-pairwise** (3-way+) entanglement |
| `cached` | — | 0 | (the reference) |

Three things fall out of this ladder:

1. **About a third of the hand-set model's error was just bad coefficients.**
   `linear → fitted` drops the RMS from 0.528 to 0.330 with no change in form. So
   when you look at the cached-vs-linear scatter, much of the spread is *not*
   evidence of non-linearity — it's the hand-picked numbers being suboptimal. The
   fitted model is the honest foil.

2. **The space is substantially non-linear, and most of that is pairwise.** The
   best possible additive model still sits 0.330 from cached; adding two-way terms
   more than halves that (to 0.149). Survival, agency and the rest really do depend
   on *combinations* of factors, not a sum of independent pulls.

3. **The space is fundamentally *gated*, not additive — the most useful single
   finding.** Four logical buckets (0.208) beat the best 18-parameter additive
   model (0.330) outright, and get most of the way to the 141-parameter pairwise
   fit (0.149) — with sixteen numbers and no tuning. That is strong evidence that
   the AI-safety value surface is organised by **logical gates**, not by additive
   contributions: *which régime you are in* dominates *how much each factor adds*.

### The four gates

The `archetype` evaluator reads three factors and ignores the rest:

```
BENIGN   orthogonality fails                        → capable systems are benign anyway
ALIGNED  holds ∧ alignment-in-time = yes            → we fielded aligned ASI
CONTROL  holds ∧ ¬aligned ∧ control deployed        → misaligned but leashed
DOOM     holds ∧ ¬aligned ∧ ¬control                → uncontained misaligned ASI
```

This mirrors the structure the hand-reasoning already used (the
`DOOM`/`CONTROL`/`ALIGNED`/`BENIGN` sub-arguments documented in `dataset.ts`). The
fact that *recovering it statistically* outperforms additive fitting is the model
confirming the narrative's own logic.

### What this means for the tool

- The `fitted` evaluator is the right **null model**: divergence from *it* (not from
  hand-`linear`) is real non-linearity worth investigating.
- The `archetype` residual (0.208) localises *within-régime* variation — once you
  know the gate, what's left is the secondary modulation (offense/defense balance,
  power concentration, takeoff) the means average over. Those are the cells most
  worth re-reasoning carefully.
- The next evaluator worth building is a **gated-additive hybrid**: classify by the
  four gates, then fit a small additive model *within* each gate. It should land
  near the pairwise fit with a fraction of the parameters, and would be both
  accurate and interpretable.

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

For the current factor set a plausible DAG is:

```
            takeoff ───────┐
              │            ▼
              ▼      alignmentInTime
      powerConcentration   ▲
                           │
orthogonality ─► tractability
        │                  │
        └────► alignmentInTime, controlDeployed ◄── takeoff
```

i.e. takeoff drives concentration and the two "in time" factors; orthogonality
drives tractability; the objective facts (orthogonality, tractability,
offense/defense) are roots. The marginal sliders the user sets would become the
**root priors**; child factors would be set by CPTs conditioned on their parents.

**Why we haven't switched yet** (and what it would take):
- It moves authoring cost from "a handful of couplings" to "a CPT per node" — more
  numbers to defend, though each is locally interpretable (`P(alignment in time |
  fast takeoff, hard tractability)`).
- The UI question becomes subtler: a slider on a *child* factor is no longer a free
  marginal — it's either a do-operator (intervention) or a soft-evidence update.
- The engine change is contained: `scenarioProbability` would consult a topological
  order of CPTs instead of a flat product, and `analyze` would no longer need the
  renormalisation step. The `Coupling` type would be replaced (or kept as a
  compile-to-CPT sugar).

**Recommended interim step:** couplings already express the most important
dependencies and are honest about being an approximation. The clean migration is to
treat the current couplings as the *specification* of a Bayes net's edges, then
author CPTs for exactly those edges — nothing else changes shape.

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
