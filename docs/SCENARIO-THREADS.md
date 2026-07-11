# Scenario threads

A **scenario thread** is a named future an entity has published — e.g. one of the
AI Futures Project's [AI 2040](https://ai-2040.com/) plans — mapped onto specific
cells of the enumerated scenario space. Threads let a concrete, cited forecast be
located inside this model: the Scenarios tab highlights each one (with a link back
to the source) and tints the cells it maps to in the table.

## Where they live

- Content: [`src/model/scenarioThreads.ts`](../src/model/scenarioThreads.ts)
  (`ScenarioThread[]`, wired into `dataset.scenarioThreads`).
- The publishing entity is a `Preset` (`entityId` → its id); clicking the entity
  name in the Scenarios tab loads that belief set. Organizations that publish
  threads use the `org` preset category (a third dropdown group beside People and
  Labs).
- UI: [`src/shell/ScenarioThreads.tsx`](../src/shell/ScenarioThreads.tsx).

## The mapping convention

A published *plan* usually fixes only the **influenceable** levers (coordination,
power concentration, takeoff via slowdown, whether alignment/control land) and
reports an outcome. It's placed against the entity's **modal objective backdrop**
(for the AI Futures Project: orthogonality holds, offense-dominant conflict,
takeover-as-extinction), so the threads differ on the *choices*, not the physics.

- A thread's `scenarios` is a list of full 10-factor assignments (`KnownScenario`,
  so a typo or missing factor is a compile error).
- When a source is a **coin-flip on success** (e.g. "≈ 50% aligned"), map it to two
  branches — a success cell and a failure cell — and the UI labels them
  "if it works" / "if it fails".
- Every mapped cell must be a real, hand-reasoned scenario (a test enforces this);
  its value and probability are shown under the *current* beliefs, so loading the
  entity's own preset shows the numbers it would assign.

## Adding an entity's threads

1. Add the entity as a `Preset` (category `org` for a non-lab project) in
   `presets.ts` — its objective backdrop is what the threads are placed against.
2. Add its `ScenarioThread`s to `scenarioThreads.ts`, mapping each named scenario
   to one (or more) full `KnownScenario`s, with a `url` to the source.
3. That's it — the Scenarios tab picks them up. Tests in `presets.test.ts` check
   the mappings resolve to authored cells and land where the source's stated
   outcome implies.

The **AI Futures Project** publishes two, grouped by `source` in the UI: **AI 2040**
(plans A/B/C/D/S) and **AI 2027** (its race and slowdown endings). Note the two
sources land the same *shape* differently — AI 2040's good ending (Plan A) is
distributed, while AI 2027's slowdown ending is a concentrated, oversight-committee
lock-in (aligned, but thin on agency).
