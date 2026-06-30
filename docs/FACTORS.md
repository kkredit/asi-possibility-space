# Factor candidates — what to add next, and what not to

A standing analysis of the factor set: what's in the model now, what could be added,
and how likely each candidate is to *earn its place*. **Nothing here is implemented
yet** — adding a factor is a deliberate, costly change (see §3). This doc exists so
that decision is made on purpose, not by reflex.

Companion to [`DESIGN.md`](DESIGN.md) §5 (which proposed the starting set and a
bench) and [`MODEL.md`](MODEL.md) (which shows the space is *gated* — relevant
below, because a new factor is only useful if it opens a new gate or meaningfully
modulates one).

---

## 1. The current set (8 factors → 864 scenarios)

| # | Factor | Kind | States | Role |
|---|--------|------|:---:|------|
| 1 | Orthogonality | objective | 2 | top gate: benign-attractor vs misalignment-default |
| 2 | Alignment tractability | objective | 3 | difficulty in principle |
| 3 | Offense/defense balance | objective | 3 | does one defector end everyone |
| 4 | Takeoff speed | objective | 3 | calendar time to react; couples to 5–8 |
| 5 | Power concentration | contingent | 2 | few actors vs proliferated |
| 6 | Alignment solved in time | influenceable | 2 | gate: did we field aligned ASI |
| 7 | Control deployed | influenceable | 2 | gate: is a misaligned system leashed |
| 8 | Coordination regime | influenceable | 2 | upstream cause: buys time for 6 & 7 (added — §2/§4) |

**The (improving) imbalance:** 4 objective, 1 contingent, now **3 influenceable**
after adding coordination (#8). The tool's whole "where to act" thesis runs on
influenceable factors, and they were the scarcest kind. The three factors that set
the four logical gates (1, 6, 7 — see [`MODEL.md`](MODEL.md) §3) are well-chosen.
*All else equal, a new influenceable or contingent factor is worth more than a new
objective one*, because it adds somewhere to act or something to track rather than
one more thing to forecast.

---

## 2. Candidate factors, ranked by expected usefulness

Usefulness = (opens or modulates a gate) × (fills an under-represented kind) ×
(independent of existing factors) ÷ (scenario-space cost). Verdicts are first-pass
and arguable.

| Candidate | Kind | States | Verdict | One-line reason |
|-----------|------|:---:|:---:|-----------------|
| **Coordination regime achieved** | influenceable | 2 | ✅ **Added** | Now factor #8 — fills the influenceable gap; `computeGovernance` targets it; causes 6 & 7 via couplings + Bayes net |
| **Deceptive alignment / sharp left turn** | objective | 2 | **High** | Decides whether "control" can work at all — currently assumed, not modelled |
| **Competitive race pressure** | contingent | 2–3 | **Med-High** | Fills the contingent gap; drives whether 6 & 7 land in time |
| **Warning shot occurs** | contingent | 2 | **Medium** | A real driver of response, but acts *through* 6/7 — maybe a coupling, not a factor |
| **Timeline to ASI** | objective | 3 | **Low-Med** | Largely collinear with takeoff speed |
| **Multipolar vs singleton** | contingent | 2 | **Low** | Substantially redundant with power concentration |
| **Whose values / alignment target** | influenceable | 2–3 | **Low-Med** | Better captured by the *agency* value dimension than a new axis |
| **Compute / hardware overhang** | objective | 2 | **Low** | Subsumed by takeoff speed; adds objective weight we don't need |

### The three worth seriously considering

**Deceptive alignment / sharp left turn** *(objective, 2: `behaves` / `defects-at-capability`)*.
The model currently treats "control deployed = yes" as straightforwardly reducing
risk. But the central reason control might *fail* is a system that behaves under
evaluation and defects once decisively capable. Today that possibility is baked
silently into the orthogonality/control cells. Making it explicit would let "control
works" be conditional on "no sharp left turn," which is exactly the kind of **gate
interaction** [`MODEL.md`](MODEL.md) shows the space is made of. Cost: ×2 → 864
scenarios. The one objective factor I'd still add, because it changes the *meaning*
of an existing gate rather than adding an independent pull.

**Coordination regime achieved** *(influenceable, 2: `regime` / `none`)* — ✅ **shipped as factor #8.**
`computeGovernance` now targets it directly; its small direct value delta is mixed
(collective restraint vs. centralization), and its real leverage is upstream — it
raises the odds of alignment-in-time and control-deployed via two couplings (and,
under the Bayes net, as a parent of both, viewable in the network diagram). Space
doubled 432 → 864; the cached cells were extended with a régime-independent delta
(`expandCoordination`) rather than re-authored.

**Competitive race pressure** *(contingent, 2–3: `cooperative` / `racing` / `all-out`)*.
The only contingent factor today is power concentration; race intensity is a
distinct situational fact (you can have a concentrated *and* cooperative frontier, or
a concentrated cutthroat one). It's a primary driver of whether alignment/control are
fielded in time, and it pairs naturally with the coordination factor as its mirror.
Risk: partial overlap with takeoff (fast takeoff intensifies racing) — manage with a
coupling rather than by dropping it.

### The ones to *not* add (and why that's the useful conclusion)

- **Timeline to ASI** and **compute overhang** are mostly **takeoff speed in
  disguise** — they'd add collinear objective dimensions that inflate the space
  without opening a new gate. The fitted-pairwise residual ([`MODEL.md`](MODEL.md))
  would absorb them as near-duplicate main effects.
- **Multipolar vs singleton** is **power concentration** under another name.
- **Whose values** is real but is a refinement of the **agency** value dimension, not
  a probability factor — model it there.
- **Warning shot** is a *cause* of the influenceable factors moving, not a value
  determinant in itself. It's a better fit as a **coupling** (or an action's
  enabling condition) than as a factor that multiplies the whole space.

The general lesson: several "obvious" factors are either redundant with an existing
one, or belong in the **value dimensions**, the **couplings**, or the **actions**
rather than as a new axis. The scenario space is the most expensive place to put a
new idea.

---

## 3. The cost discipline

Every factor multiplies the scenario space by its state count, and every authored
cell must keep up (see [`AGENTS.md`](../AGENTS.md) and the `expandTakeoff` machinery
in `dataset.ts`):

| Action | Scenarios | Hand-authored cells to keep coverage |
|--------|----------:|-------------------------------------:|
| today (8 factors) | 864 | 864 |
| + one binary factor | 1,728 | 1,728 |
| + one 3-state factor | 2,592 | 2,592 |

The engine handles any size; the **authored content** is the bottleneck. Three
disciplines keep this sane:

1. **Prefer binary.** A 3-state factor costs 50% more than a binary one for often
   marginal resolution. The hard ≤3 cap is a ceiling, not a target.
2. **Lean on the anchor-plus-delta pattern.** New factors should, where possible, be
   added the way takeoff was: author the surface over the *core* factors, then derive
   the new factor's variants with a reasoned, gate-dependent delta — not a fresh
   hand-authored cell per scenario (this is how coordination was added).
3. **Pin by default.** A newly added factor can ship pinned to its modal state, so
   the default view stays smaller and the new dimension is opt-in for exploration.

---

## 4. Recommendation

1. **Coordination regime** (influenceable, binary) — ✅ **done** (factor #8). Best
   structural fit; gave the governance action a target and rebalanced the kinds.
2. **Deceptive alignment** (objective, binary) — *next, if any.* Makes the control gate
   honest. Binary → 1,728 scenarios; manageable via the anchor-plus-delta pattern.

I would still **defer** competitive race pressure to a later step and model
warning-shots / timeline as **couplings**, not factors.

Before adding more, the cheaper win is to **re-reason the high-residual cells**
the `archetype` model flags ([`MODEL.md`](MODEL.md) §3) — improving the existing 864
sharpens every model on the ladder at zero space cost.
