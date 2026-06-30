# AGENTS.md

Contributor guide for **ASI Possibility Space** — an interactive AI-safety
possibility-space explorer. Read this before changing code.

## Orientation

You set **credences** over a handful of AI-safety **factors** (orthogonality,
alignment tractability, takeoff speed, …). The engine enumerates the full
cross-product of factor states into a probability **distribution over futures**,
scores each future on four **value dimensions** (survival, agency, suffering,
flourishing), and collapses that to a scalar **expected value (EV)**. From the
same machinery it computes a **sensitivity tornado** ("where to act" vs. "value of
information" vs. "situational awareness", keyed to factor *kind*), ranks
**actions** by their EV gain, and lets you **compare evaluators** — a hand-set
linear model, two least-squares *fitted* models, and a sparse hand-reasoned one.
Their divergence (the "model ladder") is the research signal; see
[`docs/MODEL.md`](docs/MODEL.md).

For the product framing read [`README.md`](README.md); for the design rationale
and open questions read [`docs/DESIGN.md`](docs/DESIGN.md). This file does not
repeat them — it tells you how to change things safely.

## Commands

Package manager is **pnpm** (`pnpm@10.33.0`). Scripts from
[`package.json`](package.json):

```bash
pnpm install        # install deps
pnpm dev            # vite dev server → http://localhost:5173
pnpm test           # vitest run (engine math + presets + full-tree smoke render)
pnpm test:watch     # vitest in watch mode
pnpm typecheck      # tsc -b --noEmit
pnpm build          # tsc -b && vite build → static bundle in dist/
pnpm preview        # serve the built bundle
```

There is **no lint script** and no ESLint config — `pnpm typecheck` is the static
gate. **`pnpm test` must pass before you commit.** CI also runs `pnpm test` and
`pnpm build` (see Gotchas).

## Architecture & the import-boundary rule

One-directional layering: **`model → engine → viz/shell`** (`shell` wires
`engine ↔ viz`). The boundaries are load-bearing — keep them clean:

| Layer | Path | Contains | Rule |
|-------|------|----------|------|
| `model/` | `src/model/` | Pure content: factors, states, credences, weights, outcomes, couplings, actions, presets, and the `Dataset` types. | **No logic, no React.** Data and type declarations only. |
| `engine/` | `src/engine/` | Pure math: enumeration, probability, evaluators, EV, actions, sensitivity. | **React-free and fully unit-tested.** Imports only `@model`. |
| `viz/` | `src/viz/` | Presentational React (dependency-free SVG + MUI). | **Props in, no logic, no `@engine` import.** Dumb components. |
| `shell/` | `src/shell/` | App shell: MUI theme, layout, controls, Zustand store; calls the engine and feeds results to viz. | The only layer that orchestrates. |

Path aliases (defined in both [`vite.config.ts`](vite.config.ts) and
[`tsconfig.app.json`](tsconfig.app.json) — keep them in sync): `@model/`,
`@engine/`, `@viz/`, `@shell/`. The engine re-exports everything through
[`src/engine/index.ts`](src/engine/index.ts), so consumers import from
`@engine/index`.

## "I want to change the content" → edit `src/model/dataset.ts` ONLY

This is the most important rule. **All** AI-safety content lives in
[`src/model/dataset.ts`](src/model/dataset.ts): the factors, their states,
`baselineCredences`, `defaultWeights`, `linearBaseline` + `linearContributions`,
the hand-reasoned `cachedOutcomes`, the `couplings`, and the `actions`. The engine
and UI are **content-agnostic** — they read the `Dataset` shape and render
whatever is there. To refine the model, you almost never touch `engine/` or
`shell/`; you edit `dataset.ts`. (Belief *presets* — public figures' stated views
— live in the sibling [`src/model/presets.ts`](src/model/presets.ts).)

The shapes you'll edit are all in [`src/model/types.ts`](src/model/types.ts).

### Add or edit a factor

A `Factor` ([types.ts:23](src/model/types.ts)):

```ts
{
  id: 'takeoff',
  label: 'Takeoff speed',
  kind: 'objective',           // see below
  question: '…',
  description: '…',
  states: [ { id: 'fast', label: 'Fast', blurb: '…' }, … ],  // ≤ 3 states
}
```

- **≤ 3 states is a hard cap.** It keeps the scenario space small enough to
  enumerate *and* hand-author every cell (cacheability). Today's 8 factors give
  `2·3·3·3·2·2·2·2 = 864` scenarios; more states explode that combinatorially.
- The three `kind`s are the spine of the tool. (Full definition in
  [types.ts](src/model/types.ts) `FactorKind`.) A slider means a **timeless
  confidence** for objective factors but a **forecast of the state at ASI onset** for
  the rest — those variables are still in motion until the threshold.
  - **`objective`** — a timeless structural fact (the maths of intelligence, the
    physics of ASI conflict), true the same way in any universe. Unmovable; you only
    discover it, by research. High sensitivity = **value of information** (gold).
    Actions may **not** target objective factors.
  - **`contingent`** — a feature of the ASI-onset world we have *low* leverage over
    (driven mostly by exogenous forces). You mainly forecast and position for it;
    actions nudge it weakly. High sensitivity = **situational awareness** (grey).
  - **`influenceable`** — a feature of the ASI-onset world our choices have *high*
    leverage over. **Where actions chiefly attach** (green = "where to act").
  - ⚠️ Contingent vs. influenceable is a **leverage spectrum**, not "fact vs. choice"
    — both are forecasts of the world at the threshold; they differ only in how much
    our choices move them. Classify a factor `influenceable` when our choices
    dominate its outcome, `contingent` when exogenous forces do.

### baselineCredences

`baselineCredences` ([types.ts:109](src/model/types.ts)) is `Record<FactorId,
Record<StateId, number>>`. **Each factor's states must sum to 1.** A test asserts
total probability over all scenarios is 1; broken sums will surface there.

### The cached / hand-reasoned cells

The cached evaluator's content is the cleverest part of `dataset.ts`. Don't author
all 864 cells by hand:

1. The **`cell(...)` helper** ([dataset.ts:227](src/model/dataset.ts)) builds one
   `CachedCell` over the **six** non-takeoff factors from a
   `[survival, agency, suffering, flourishing]` tuple plus a narrative.
2. **`failsTable`** ([dataset.ts:261](src/model/dataset.ts)) generates the
   orthogonality-`fails` branch from a compact table (when orthogonality fails the
   AI is benign regardless, so tractability is moot and the same value is emitted
   at all three tractability levels).
3. Together these produce **144 `baseCells`** ([dataset.ts:319](src/model/dataset.ts)),
   which are the **MEDIUM-takeoff anchor**.
4. **`expandTakeoff`** ([dataset.ts:600](src/model/dataset.ts)) turns each
   medium-anchor cell into its `{fast, medium, slow}` variants: `medium` is the
   authored value **verbatim**; `fast`/`slow` are derived by adding a
   **corner-dependent delta** (`classifyCorner` → `doom`/`control`/`aligned`/
   `benign`, then `takeoffDelta` + `takeoffClause`). So takeoff's effect is
   reasoned per-corner, not assumed uniform.
5. **`expandCoordination`** then splits each cell into `{none, regime}` (a small
   régime-independent delta; coordination's real effect is on the *odds* of
   alignment/control, via the couplings + Bayes net).
6. `cachedOutcomes = baseCells.flatMap(expandTakeoff).flatMap(expandCoordination)` →
   **864 cells**, spanning all 8 factors. A test asserts this count and that every
   enumerated scenario is reasoned.

To re-author an outcome, edit the relevant `cell(...)`/`failsTable` entry (changes
its medium anchor and both derived variants), or adjust the `takeoffDelta` /
`takeoffClause` for a corner to change how takeoff speed moves things.

### Couplings

`couplings` ([dataset.ts:628](src/model/dataset.ts), shape at
[types.ts:84](src/model/types.ts)) correct the independence assumption. Each is a
**log-linear multiplier**: every scenario matching all of its `when`
`(factor=state)` conditions has its independent prior multiplied (`>1` boosts,
`<1` suppresses, `0` forbids). `analyze` then **renormalizes** so total mass is
unchanged — couplings only *redistribute* probability. Example: `fastTakeoff_
concentrates` suppresses the (fast, diffuse) corner to `0.12×`.

There's also an **opt-in Bayes net** (`bayesNet` in dataset.ts, engine in
[`bayesnet.ts`](src/engine/bayesnet.ts)) — the principled successor to
independence×couplings. `analyze(..., pins, jointProbability)` swaps the joint over
to it; it's off by default. Validate edits with `validateBayesNet`. See docs/MODEL.md §5.

### Actions

`actions` ([dataset.ts:693](src/model/dataset.ts), shape at
[types.ts:102](src/model/types.ts)) are sets of `ActionDelta`s that shift
probability mass toward a target state. **Deltas may target influenceable factors,
and (with smaller magnitude) contingent ones — never objective factors**, since
those are timeless facts, not features of the world-to-come. `applyAction` moves
`magnitude` onto the target state and redistributes the remainder proportionally.

> ⚠️ **Adding a factor or extra states multiplies the scenario space** and will
> break the `864`-cell assumptions: you may need to re-author `baseCells`, extend
> `failsTable`, or rework `expandTakeoff`. The engine handles any space; the
> *authored content* is what has to keep up. Un-authored cells silently fall back
> to the linear evaluator (and are flagged as not-reasoned), so check the
> Evaluators tab after a change.

### Checklist: adding a new factor

Touchpoints, in order — all in `dataset.ts` unless noted. (The `coordination`
factor, commit history, is a complete worked example of every step.)

1. **`factors[]`** — add the `Factor` (≤ 3 states; pick the `kind`).
2. **`baselineCredences`** — add its prior; states **must sum to 1**.
3. **`linearContributions`** — add per-state value contributions (use `{}` per state
   for a value-neutral factor whose effect is purely on probabilities).
4. **Cached cells** — extend the authoring pipeline so cells cover the new factor:
   add an `expand<Factor>(cell) => CachedCell[]` step (like `expandTakeoff` /
   `expandCoordination`) and chain it into `cachedOutcomes`. This multiplies the cell
   count. (Skip only if you accept a flagged linear fallback for the new dimension.)
5. **`couplings`** — add any dependencies so the factor is causal in the *independence*
   model (the default).
6. **`bayesNet`** — add a node. Root (prior from slider) or child with a `cpt`. If it's
   a *parent* of existing children, expand their CPTs (keys are parent states joined
   by `|` in `parents` order). Every factor needs a node or `validateBayesNet` fails.
7. **`actions`** — point any relevant action at it (objective factors stay off-limits).
8. **Presets** (`presets.ts`) — optional: unstated factors fall back to baseline (store
   merge), but research-grounded credences are better. Keep `factorNotes`/citations in sync.
9. **Tests** — update hardcoded counts (`engine.test` scenario/cell totals + the
   cross-product title + pinned count; `fit.test` `featureCount`/`sampleCount`) and add
   the new factor key to any literal scenario object (else its cached lookup falls back).
10. **Docs** — bump counts in this file, `docs/FACTORS.md` (move from candidate to
    added), `docs/MODEL.md` (ladder param counts + scenario count), README/DESIGN.

Then `pnpm typecheck && pnpm test && pnpm build` must all pass.

## "I want to add an evaluator"

An `Evaluator` ([types.ts:64](src/model/types.ts)):

```ts
interface Evaluator {
  id: string;
  label: string;
  description: string;
  evaluate(scenario: Scenario, dataset: Dataset): Outcome | undefined;
}
```

Returning `undefined` means "no opinion on this cell." Steps:

1. Add a file under [`src/engine/evaluators/`](src/engine/evaluators). Four are
   user-selectable (listed in the `evaluators` array): `fitted.ts` (two least-squares
   fits — main effects and main+pairwise, both solved against the cached cells by
   [`src/engine/fit.ts`](src/engine/fit.ts)), `archetype.ts` (a domain-specific
   logical-gate model — classify into benign/aligned/control/doom, predict the
   group mean), and `cached.ts` (the hand-reasoned surface). A fifth, `linear.ts`
   (a crude hand-set additive model), is intentionally **not** in the registry — it
   exists only as the internal fallback for un-authored cells (cached/archetype defer
   to it; with all 864 cells authored it never actually fires).
2. Register it in [`src/engine/evaluators/index.ts`](src/engine/evaluators/index.ts):
   add it to the `evaluators` array (ordered most- to least-faithful);
   `getEvaluator(id)` resolves by id and falls back to `linearEvaluator`.
3. That's it for the UI — the Controls panel's evaluator dropdown auto-renders
   whatever is in the `evaluators` array, and the Evaluators tab measures each
   model's RMS divergence from cached (`evaluatorFit` in `analyze.ts`) for the
   model ladder.

Note the **cached evaluator falls back to linear** for un-authored cells (so its
surface is always defined), and `isReasoned(scenario, dataset)` reports whether a
cell was authored vs. fell back. The fitted models train only on reasoned cells.

## Testing conventions

- **Vitest**; tests live **next to the code** as `*.test.ts` / `*.test.tsx`
  (`include: ['src/**/*.test.{ts,tsx}']`).
- Coverage today:
  - [`src/engine/engine.test.ts`](src/engine/engine.test.ts) — enumeration,
    probability, couplings (mass preservation + the specific dependencies),
    scalarization, the evaluators, actions, sensitivity, distribution, plus
    dataset integrity (no duplicate keys, valid ids, values in `[-1,1]`, all 864
    cells authored).
  - [`src/engine/fit.test.ts`](src/engine/fit.test.ts) — the linear solver, and
    that each rung of the model ladder fits the cached surface better than the
    last (hand-linear > fitted > fitted+pairwise in residual).
  - [`src/model/presets.test.ts`](src/model/presets.test.ts) — preset validity.
  - [`src/shell/smoke.test.tsx`](src/shell/smoke.test.tsx) — renders the **whole
    component tree** once via `renderToString` to catch engine↔viz wiring crashes
    a type-check can't see.
- **New engine math MUST get a test.** The engine is the trustworthy core; keep it
  that way. Content edits to `dataset.ts` should keep the integrity tests green
  (sums to 1, cells in range, 864 authored).

## Gotchas

- **GitHub Pages auto-deploy is currently paused.** In
  [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) the `push`
  trigger is commented out; the workflow only runs on `workflow_dispatch`. It
  still runs `pnpm test` + `pnpm build` when dispatched. Re-enable by uncommenting
  the `push:` block (after the repo is public and Pages is enabled).
- **Vite `base: './'` (relative).** The static bundle works under any
  `https://<user>.github.io/<repo>/` path without hard-coding the repo name. Don't
  introduce client-side routing or absolute asset URLs — the app uses tab
  navigation, not a router.
- **URL state encodes the active preset in the hash** (`#preset=<id>`), read/written
  in [`src/shell/store.ts`](src/shell/store.ts). It's SSR-safe and only restores
  known preset ids. Manual credence/weight edits clear the preset (and the hash).
  Credences/weights themselves are **not** URL-encoded.
- Keep the `@…/*` path aliases identical in `vite.config.ts` and
  `tsconfig.app.json` — they're declared in two places.

## Don't

- Don't put logic or React in `model/`, or import `@engine` from `viz/`.
- Don't hand-author all 864 cached cells — use `cell` / `failsTable` /
  `expandTakeoff`.
- Don't target objective factors with actions.
- Don't commit with failing tests.
