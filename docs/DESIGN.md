# AI Safety Possibility-Space Explorer — Design Doc

> Working title. Alternatives: *Futurescape*, *P(Δ) — the change-the-future tool*, *Crux*.
> Status: **DRAFT for iteration.** Per our agreement, we nail down the *content* (factors,
> states, outcomes, values, actions) in prose here before encoding anything. Architecture and
> tech-stack sections are proposals with sensible defaults you can override.

---

## 1. Vision

An interactive, single-page web app for exploring the possibility space of AI safety. You set
your credences over a handful of key questions ("odds the Orthogonality Thesis holds: 9:1"),
the tool combines them into a probability distribution over *futures*, scores each future on
several value dimensions, and surfaces:

1. the **expected value** of the future given your current beliefs;
2. the **shape** of the distribution (not just the mean — where the probability mass actually lands);
3. the **maximum-EV action** you could take now, and **why** (which beliefs your EV is most
   sensitive to, separated into "things you can change" vs. "things worth forecasting harder").

Twin purpose: a personal instrument to **refine your own opinions**, and a shareable tool for
**others to do the same** (belief configurations are encoded in the URL so a view can be linked).

---

## 2. Conceptual model

This is the heart of the project. Five concepts.

### 2.1 Factors

A **factor** is one key question. Each factor has **≤ 3 mutually exclusive states** (hard cap, so
the scenario space stays cacheable — see §4). You assign a **credence** to each state (the states'
credences sum to 1).

Every factor is tagged with one of **three kinds**. First, **what the slider means**
differs by kind: for *objective* factors it's your present confidence that a timeless
property holds; for everything else it's a **forecast of the factor's state at ASI
onset** — the threshold where value locks in — because those variables are still in
motion until then. Second, the kind fixes how you reduce your uncertainty or act:

| Kind | What the slider is | Leverage we have | How you engage it | Example |
|------|------|------|------|---------|
| **Objective** | Confidence a timeless, structural fact holds (same in every possible world). | None — off the leverage axis; unmovable in any universe. | *Discover* which way it is, by **research**. High sensitivity ⇒ **value of information**. | Orthogonality Thesis; alignment tractability *in principle*; offense/defense balance at ASI scale. |
| **Contingent** | Forecast of its state at ASI onset. | **Low** — trajectory driven mostly by exogenous forces (geopolitics, markets, who races whom). | Mainly *forecast and position*; actions nudge it weakly. High sensitivity ⇒ **situational awareness**. | *(none in the current set — retained as a kind; e.g. a future "race structure" factor.)* |
| **Influenceable** | Forecast of its state at ASI onset. | **High** — our choices substantially move it. | *Act*. High sensitivity ⇒ **this is where to act**. | Whether alignment is solved *in time*; whether control is deployed; governance/coordination; power concentration among frontier actors. |

The subtle point: **contingent and influenceable are the same *kind* of thing** — both
forecasts of the world at the threshold — and differ only in **how much grip we have on
them**. The line is *leverage*, a continuum: a factor is influenceable when our choices
dominate its outcome and contingent when exogenous forces do. Actions can attach to
both (weakly to contingent); only **objective** factors are truly off-limits, because
they're timeless facts, not features of the world-to-come. That epistemic gap — fact vs.
forecast — is what really sets objective apart.

This is what makes "where can we exert positive influence?" fall out of the model: it
tracks the leverage axis, peaking on the influenceable factors.

### 2.2 Scenarios

A **scenario** is one assignment of a state to every (active) factor — one complete possible
world. The set of all scenarios is the cross-product of factor states. With the v1 factor set
(§5) that's a few hundred scenarios.

**Factor pinning:** any factor can be *pinned* to a single state, which removes it as a free
dimension and shrinks the cross-product. Pin the objective factors to your best guess and explore
just the influenceable subspace; or pin everything except one factor to study it in isolation.

**Scenario probability**: two models ship. The **Bayes net** (the default) defines the joint
via a DAG + CPTs and rakes to your slider marginals; **independence × couplings** — where
`P(scenario) = ∏ P(state_f)` corrected by a sparse set of dependency multipliers — is the
readable opt-out. Known dependencies (e.g. "fast takeoff makes alignment-in-time less likely")
are captured either way. See [`MODEL.md`](MODEL.md) §4–§5.

### 2.3 Value (multi-dimensional)

Each scenario's outcome is scored as a **value vector** over a few dimensions, each in `[-1, +1]`:

| Dimension | −1 | +1 |
|-----------|-----|-----|
| **survival** | humanity ends | humanity persists |
| **agency** | permanent lock-in / tyranny / loss of human control | humans retain meaningful self-determination |
| **suffering** | s-risk (astronomical suffering, worse-than-death) | no large-scale involuntary suffering |
| **flourishing** | squandered future, value not realized | broad realization of human/▢ value |

You set **weights** over these dimensions (sliders). The scalar EV used to rank everything is
`V(scenario) = Σ_d weight_d · value_d(scenario)`. Surfacing the vector (not just the scalar) is the
point — it lets you see *which kind* of bad a future is, and how your weighting changes the verdict.
(Starting dimension set is a proposal; trim/rename freely.)

### 2.4 Evaluators (pluggable — the research instrument)

You raised the real question: do factors combine via a clean equation, or do we have to reason
through each scenario and cache the result? **We don't bet on one answer — the evaluator is a
pluggable interface and we ship several, then compare them.** An evaluator maps a scenario to an
outcome `{ narrative, valueVector }` (or `undefined` if it has no opinion on that cell).

- **Linear evaluator** — `value_d = baseline_d + Σ_f w[f, state, d]`. No interactions between
  factors. Tests the "nice result" hypothesis: *is the space approximately linear?*
- **Cached / hand-reasoned evaluator** — a lookup table keyed by the scenario tuple, with an
  authored narrative + value vector per cell. It now covers **all 1,728 scenarios** (built from
  144 anchor cells expanded along takeoff × coordination × deception; a test enforces full
  coverage). Any genuinely missing cell would fall back to the linear evaluator.
- **(Future) rule/logic evaluator; Bayes-net; LLM-assisted evaluator.**

The **comparison view** is itself the research output: plot cached value vs. linear value per
scenario; the **residuals quantify how non-linear reality is**, and the biggest divergences point
to exactly the scenarios where the simple story breaks down and is worth a careful look. The
workflow — fill a cached cell, watch it diverge from linear, decide which you trust — is how we
converge on "how these things fundamentally relate."

### 2.5 Actions

An **action** is something you could do now. It's modeled as a bundle of **deltas on influenceable
factors** (objective factors are off-limits by construction). Each delta shifts probability mass
toward a target state by some magnitude. To rank actions:

```
EV_baseline = Σ_s P(s)·V(s)
For each action a:  EV_a = Σ_s P_a(s)·V(s)     # P_a uses the shifted credences
action value(a) = EV_a − EV_baseline           # optionally − cost(a)
max-EV action = argmax_a action value(a)
```

### 2.6 Sensitivity → "where to act"

For each factor, compute the EV swing as it's pinned across its states (a **tornado chart**),
**color-coded by kind**:

- **Influenceable** + big swing → *act here* (and an action probably exists for it).
- **Objective** + big swing → *value of information*: your EV hinges on a fact you're unsure of;
  forecasting/research to tighten that credence is the high-leverage move.
- **Contingent** + big swing → *situational awareness*: it matters a lot which world we're in.

---

## 3. Worked example (sanity check of the whole pipeline)

Your prompt's scenario, mapped onto the v1 factors:

> orthogonality **holds** · power **diffuse** (open-source dominant) · alignment-in-time **no** ·
> control **deployed: yes** · offense/defense **offense-dominant**

Outcome narrative (cached cell): *"Everyone has controlling access to a superintelligence. The AI
itself doesn't kill us — control is solved — but capability is fully proliferated and offense
dominates, so any single sadistic or nihilistic human can end everyone. We die, by our own hand."*

Value vector: `survival −0.9 · agency +0.3 · suffering −0.4 · flourishing −0.8` → strongly negative
scalar EV. Contrast the same tuple with offense/defense flipped to **defense-dominant**: now
proliferated control is *stabilizing* and survival flips positive — which is precisely the kind of
crux the tool is built to expose.

---

## 4. Scenario-space sizing & the caching strategy

- Hard cap: **≤ 3 states/factor.**
- v1 active set (§5) ≈ **144 scenarios** (2·3·3·2·2·2). The scenario table / parallel-coordinates
  handle that easily.
- 144 hand-authored cached cells is a lot to write up front, so caching is **incremental and
  lazy**: author the high-probability and high-|value| cells first; everything else falls back to
  the linear evaluator and is flagged. **Pinning** lets you reduce to a slice (e.g. pin the 3
  objective factors → 8 influenceable scenarios) and exhaustively reason that slice.
- Factors can be toggled active/inactive, so the space can be grown or shrunk deliberately.

---

## 5. Proposed v1 content (← iterate here)

Six factors to start (you said 5–10; six keeps the cross-product ~144). A **bench** of further
candidates is listed below — adding any is a one-line data change.

**Objective (credence only):**
1. **Orthogonality Thesis** — *Is misalignment the default for capable systems?*
   - `holds` (goals ⟂ capability; misalignment is the default) · `fails` (capable systems converge
     toward benevolence). *2 states.*
2. **Alignment tractability (in principle)** — *How hard is it to technically align an ASI, at all?*
   - `easy` · `hard` · `near-impossible`. *3 states.* (Distinct from whether we *achieve* it — see #5.)
3. **Offense/defense balance at ASI scale** — *In a world of ASI-empowered actors, does attack or
   defense win?*
   - `offense-dominant` · `balanced` · `defense-dominant`. *3 states.*

**Contingent (situational, ~fixed):**
4. **Power concentration** — *Is frontier capability gated by a few actors or widely proliferated?*
   - `concentrated` (few labs/states) · `diffuse` (proliferated / open-source dominant). *2 states.*

**Influenceable (actions attach here):**
5. **Alignment solved & deployed in time** — *Do we actually field aligned ASI before catastrophe?*
   - `yes` · `no`. *2 states.*
6. **Control solved & deployed** — *Even if not aligned, can we contain/monitor/correct it
   (AI-control agenda)?*
   - `yes` · `no`. *2 states.*

**Bench (candidates to add / swap):** Takeoff speed (`fast`/`moderate`/`slow`) — note: arguably
straddles objective & influenceable; Governance/coordination achieved (`strong`/`weak`/`none`);
Multipolar vs. singleton outcome; Timeline to ASI (`<5y`/`5–15y`/`>15y`); Warning shots occur.

**Proposed value dimensions:** survival, agency, suffering, flourishing (see §2.3).

**Proposed starter actions** (deltas on influenceable factors):
- *Fund technical alignment* → push `alignment-in-time` toward `yes`.
- *Fund/standardize AI control* → push `control` toward `yes`.
- *Compute-governance / coordination regime* → push `alignment-in-time` toward `yes` (buys time)
  and slightly toward `concentrated` (contingent nudge).
- *Defensive acceleration (d/acc)* → can't move the objective offense/defense balance, but a
  candidate to model as nudging realized control + tilting toward `defense-dominant` if we decide
  that factor is partly influenceable. (Flagged for discussion — see §10.)

---

## 6. Architecture & modules

Three clean, separable modules with explicit interfaces (matches your "ui wrapper / N-dim viz lib /
data store" split). v1 lives as folders inside one Vite app with enforced import boundaries; can be
promoted to real workspace packages later without touching the interfaces.

```
src/
├── model/      # THE DATA STORE — pure content, no logic, no React
│   ├── types.ts        # Factor, FactorState, Scenario, ValueVector, Outcome, Action, Evaluator…
│   └── dataset.ts      # the AI-safety content: factors, states, baseline odds, actions,
│                       # cached outcomes, linear weights. (file-first; JSON-extractable later)
│
├── engine/     # PURE FUNCTIONS — the math. No React. Fully unit-tested (Vitest).
│   ├── scenarios.ts    # enumerate, pin, probability model (independent product)
│   ├── evaluators/     # linear.ts, cached.ts, index.ts (the pluggable registry)
│   ├── value.ts        # scalarize(vector, weights)
│   ├── actions.ts      # apply deltas, recompute EV, rank
│   └── sensitivity.ts  # tornado swings, value-of-information tagging
│
├── viz/        # THE N-DIM VISUALIZATION LIBRARY — presentational React, props in, no logic
│   ├── ParallelCoordinates.tsx   # each factor an axis; each scenario a polyline,
│   │                             # colored by value, opacity by probability  ← the "N-dim space"
│   ├── ScenarioTable.tsx         # sortable/filterable by state, prob, EV; shows narratives
│   ├── EVDistribution.tsx        # histogram of probability mass over the value axis
│   ├── Tornado.tsx               # sensitivity bars, colored by factor kind
│   ├── ActionRanking.tsx         # bar chart of EV gain per action
│   └── EvaluatorDiff.tsx         # cached-vs-linear scatter + residuals
│
└── shell/      # THE UI WRAPPER — MUI theme, layout, controls, state wiring, URL sync
    ├── App.tsx, theme.ts, layout/
    ├── controls/   # credence sliders, weight sliders, evaluator selector, pin toggles, action picker
    └── store.ts    # global belief state (Zustand); encodes/decodes to URL
```

Dependency rule: `shell → viz → (props only)` and `shell → engine → model`. `viz` and `model`
never import `engine`'s React-free math directly; `shell` orchestrates. `engine` and `model` are
React-free and independently testable.

---

## 7. Tech stack & GitHub Pages

- **Vite + React + TypeScript.** Static build → drops straight onto GitHub Pages. (Not Next.js:
  Pages wants a static bundle, and Vite is the least-friction path.)
- **MUI v6** for the shell/controls/theme.
- **Charts:** `@mui/x-charts` (or Recharts) for bars/histogram/tornado; a small **custom SVG +
  D3-scale** component for parallel coordinates (no off-the-shelf MUI parallel-coords exists).
  Keeps the viz dependency surface minimal and self-contained.
- **State:** Zustand (tiny), with **state ↔ URL** sync so any belief configuration is a shareable link.
- **Tests:** Vitest on `engine/` — the math must be correct and is pure, so it's cheap to cover well.
- **Deploy:** GitHub Actions → `actions/deploy-pages`. `vite.config` `base: '/<repo>/'`. If we add
  routing, use `HashRouter` (Pages has no server-side rewrites); v1 likely needs only tabs, no router.

---

## 8. Build plan (milestones)

1. **M0 — Scaffold & deploy path.** Vite+React+TS+MUI, empty shell, GitHub Actions → Pages live.
   Proves the deployment story end-to-end before any logic.
2. **M1 — Model + engine + tests.** Encode the §5 dataset; implement scenario enumeration, the
   independent probability model, linear evaluator, scalarization, EV. Vitest coverage.
3. **M2 — Core UI.** Credence sliders, weight sliders, the headline EV number, the scenario table,
   the EV-distribution histogram. First fully interactive loop.
4. **M3 — N-dim viz + sensitivity.** Parallel coordinates; tornado colored by kind.
5. **M4 — Actions.** Action library, EV-gain ranking, "max-EV action" callout.
6. **M5 — Evaluator comparison.** Cached evaluator + authoring of high-priority cells; cached-vs-
   linear diff view.
7. **M6 — Share + polish.** URL state sync, copy/explanations, factor pinning UI, mobile layout.

---

## 9. Design decisions (settled)

These were the early open questions; each now has a decision, encoded in
`src/model/dataset.ts`. They remain editable — this records *what was chosen and why*,
not a claim they're immutable.

1. **Value dimensions** — **survival / agency / suffering / flourishing**, defaults
   weighted toward survival & suffering. Kept.
2. **Factor set** — grew from the original six to **9** (added coordination and
   deceptive alignment; power concentration reclassified objective→influenceable). See §5.
3. **Offense/defense balance — objective.** No action attaches to the *balance* itself: a
   sufficiently capable system finds what's optimal for both attack and defense, so the
   balance is a structural fact we observe, not steer. d/acc is modeled as boosting realized
   *control*, not moving the balance.
4. **Dependencies — both models, Bayes net is the default.** Independence×couplings remains
   as a readable opt-out; the **Bayes net** (with soft-evidence raking) is the default joint.
5. **Action cost — omitted for now.** Actions are ranked by **raw EV gain**; a
   cost/feasibility term is out of scope (cost is per-actor and subjective).
6. **Name** — **ASI Possibility Space**.
7. **Pin semantics — conditional.** Pinning a factor conditions on it (the distribution
   renormalizes to sum to 1), so a pinned EV / p(doom) reads as "given this factor," not a
   mass-weighted slice.
8. **Coordination → power concentration** — a governance regime is modeled as *concentrating*
   the (governable) frontier; flip the coordination→power coupling/CPT to model governance-as-
   openness instead.

---

## 10. Known limitations (deliberate scope)

- **Single decision-maker frame** for actions (no game-theoretic interaction between actors' choices).
- **Point estimates, not distributions** — values and credences are single numbers, not ranges.
- **No action-cost term** (§9.5) — rankings are raw EV gain, not EV-per-unit-effort.
- The **`Coupling`** type and the Bayes-net CPTs encode the same dependencies two ways; kept in
  parallel (couplings are the readable model, the net is the principled default).

*(The former "sparse cached evaluator / cells fall back to linear" limitation is resolved — all
1,728 scenarios are now hand-reasoned; a test enforces full coverage.)*
