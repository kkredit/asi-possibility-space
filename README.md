# AI Safety Possibility-Space Explorer

An interactive tool for exploring the AI-safety possibility space. Set your credences over a handful
of key questions, watch them combine into a probability distribution over futures, see the expected
value, and find the maximum-EV action to take now.

> **Status: proof of concept.** All AI-safety content (factors, probabilities, outcomes, weights) is
> a **presumed first-pass default**, chosen to make the tool concrete — not a set of locked-in
> claims. See [`docs/DESIGN.md`](docs/DESIGN.md) §5 and §9 for the open questions, and edit
> [`src/model/dataset.ts`](src/model/dataset.ts) to refine the model.

## Quick start

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # engine unit tests + full-tree render smoke test
pnpm build      # static bundle in dist/ (GitHub Pages ready)
```

## What it does

- **Beliefs panel** — sliders for your credence in each factor's states, grouped by the three
  factor *kinds* (objective / contingent / influenceable). Pin any factor to collapse it. Adjust the
  value-dimension weights. Switch the active evaluator.
- **Landscape** — the outcome distribution (probability mass over the value axis) and a
  parallel-coordinates view of the whole N-dimensional scenario space.
- **Where to act** — actions ranked by EV gain (the max-EV action), and a sensitivity tornado
  colored by factor kind: green = where to act, gold = where forecasting has the most value of
  information, grey = where situational awareness matters.
- **Scenarios** — sortable table of every scenario with its probability, value, and (where authored)
  hand-reasoned narrative.
- **Evaluators** — cached-vs-linear scatter; the residual measures how non-linear the space is.

## Architecture

Three cleanly separated modules with one-directional dependencies
(`shell → viz`, `shell → engine → model`):

```
src/
├── model/    # the data store — pure content (factors, odds, outcomes, actions). No logic.
├── engine/   # pure math — enumeration, probability, evaluators, EV, actions, sensitivity. Tested.
├── viz/      # the N-dim visualization library — presentational SVG/MUI components, props in.
└── shell/    # the UI wrapper — MUI theme, layout, controls, Zustand state, engine↔viz wiring.
```

The evaluator is a **pluggable interface** ([`src/engine/evaluators/`](src/engine/evaluators)). Two
ship today — a crude *linear* model and a sparse *cached / hand-reasoned* model that falls back to
linear for un-authored cells — and comparing them is the point: their divergence is the research
signal for understanding how the factors actually relate.

## Tech

Vite + React + TypeScript + MUI v6, Zustand for state, Vitest for tests. The visualizations are
dependency-free SVG. Builds to a static bundle.

## Deployment

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys to GitHub Pages on
push to `main`/`master`. In the repo settings, set **Pages → Source → GitHub Actions**. The Vite
`base` is relative (`./`), so it works under any `https://<user>.github.io/<repo>/` path without
configuration.
