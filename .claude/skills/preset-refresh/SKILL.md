---
name: preset-refresh
description: >-
  Audit src/model/presets.ts against each entity's current public statements:
  verify stated p(doom) figures and citations still hold, fix stale
  bio/affiliation/role details, add fresher references, and evaluate whether
  any newly-notable public figures deserve a new preset. Recalibrates and
  tests any numeric changes. Use when the user says /preset-refresh, "refresh
  the presets", "check the p(doom) presets are current", "audit presets.ts
  against current sources", or similar.
---

# preset-refresh

`src/model/presets.ts` holds this app's "belief presets" — named
people/labs/orgs with credences, a sub-credence deep-dive, cited references,
and prose (`summary`, `reconciliation`, `factors[*].note`) that render
directly in the app's preset picker and detail panel. Each preset's entire
point is fidelity to that entity's *actual, current* public position. Public
positions drift: people change jobs, give sharper numbers in a later
interview, or a citation turns out to have a fresher replacement. This skill
finds and fixes that drift.

## 1. Enumerate presets and split the research

- `grep -n "id: '" src/model/presets.ts` for the full current list (people,
  labs, orgs).
- This is wide, independent web research across ~15-20 entities — the right
  shape for concurrent `Agent` calls with `subagent_type: "fork"`, not one
  long serial pass. Split into 2-4 groups (e.g. by category, or roughly in
  half) and launch them **in one message** so they run concurrently. Forks
  inherit this session's context, so they don't need re-briefing on the
  schema below — just the ids they own and the constraints in this file.
- Also spin up a fork to check whether any org preset's CEO/founder (e.g.
  `xai`/Musk, `anthropic`/Amodei, `deepmind`/Hassabis) has personal statements
  distinct enough from the institutional line to warrant something new, and
  whether a Wikipedia-style aggregator (e.g. the "P(doom)" article) surfaces
  anyone genuinely notable who isn't in the file yet — see step 3 before
  proposing any addition, since the answer is often "already covered."

## 2. What each fork should check per preset

For every assigned preset:

- Does `pdoom` still match their most recent, most specific stated position?
  Fetch the actual interview/essay/tweet (`WebFetch`/`WebSearch`) — don't
  trust an aggregator's paraphrase.
- Do the `references[]` URLs and `quote` fields still hold? Is there a more
  recent statement worth citing alongside or instead of the current one?
- Is `affiliation`/`role` still accurate? People change jobs and titles — a
  prior run of this skill caught someone leaving their lab for a new startup
  and someone else's institutional role shifting.
- Report per entity as **CONFIRMED** / **STALE** (cite the newer source,
  with URL + date) / **DISCREPANCY** (the source doesn't say what the file
  claims). Keep each verdict to a couple of sentences.

## 3. Before adding anyone new

- Check an aggregator for names not yet in the file, but verify every number
  against the *primary* source before proposing an addition.
- **Check for redundancy with existing org presets first.** A lab's
  `org`/`lab` preset may already encode that CEO's or founder's *personal*
  view rather than an institutional one — read its `role` and the actual
  quoted references before proposing a standalone person preset for the same
  individual. Adding one anyway just duplicates the org preset's sourcing.
- Only add someone whose profile is specifically notable in AI-safety/
  AI-industry discourse (not general fame), whose position is stable and
  precise enough to code cleanly (a "5-50%" range spanning years is hard to
  pin to real credences), and who's meaningfully distinct in framing from
  everyone already in the file.

## 4. Applying fixes

- **Bio/citation fixes** (affiliation, role, adding a reference) are
  low-risk — apply directly.
- **New citations**: append to `references[]` rather than reordering it, and
  update any `factors[*].refs: [...]` index arrays that should now point at
  the new entry too.
- **Never reword a `quote` field** — it's verbatim. If a quote turns out to
  be wrong or mistranscribed, replace or drop the whole reference instead of
  editing the quoted text.
- **Numeric credence changes** (their actual position moved) are higher-risk
  than bio/citation fixes and require the calibration pass below before
  they're done.

## 5. Adding or changing numbers: calibrate before committing

This file is a calibrated model, not free-form text. Two layers of
`presets.test.ts` guard it:

- The **general suite**, run for every preset: credences/subCredences sum to
  1 per factor, every top-level factor has a non-empty note, references are
  `https://` with in-range `refs` indices, `reconciliation` is >80 chars,
  and — the one most likely to break on a numeric edit — `deriveCredences()`
  must land within **±0.1** of the stated `alignmentInTime.yes` and within an
  **L1 gap of 0.45** on `tractability` (see "derived parents stay in the
  neighborhood of the stated top-level credences").
- The **`BANDS` map** near the bottom of `presets.test.ts` pins specific
  presets' modeled extinction/takeover-total probability mass to a range
  matching their stated doom. Touching a banded preset's numbers, or adding a
  preset with a clear stated figure, means adding or updating its band.

**Iterate numerically, don't guess blind.** Write a throwaway
`src/model/_scratch.test.ts` that imports `dataset`, `presets`,
`deriveCredences`, and `analyze`/`doomMass`/`disempowermentMass`/
`reconcileJoint` from `@engine/index`, prints the derived `alignYes` gap, the
`tractability` L1 gap, and the modeled extinction/total % for the preset(s)
you're touching, and run it with:

```
pnpm exec vitest run src/model/_scratch.test.ts --reporter=verbose
```

(plain `pnpm test` swallows `console.log` output). Adjust `credences` /
`subCredences` until the numbers land inside tolerance, then **delete the
scratch file** before finishing — it must never be committed.

Run `pnpm typecheck && pnpm test && pnpm build` after every batch of edits.

## 6. Style pass on anything you write

Any new prose (`summary`, `reconciliation`, `factors[*].note`, or a whole new
preset) needs to clear this repo's copy bar before you're done:

- Read `~/.claudisms.md` per the global CLAUDE.md "Human-facing prose" rule
  and strip what it names.
- Specifically avoid: em dashes, "sharper"/"sharpen(ing)"/"load-bearing",
  negative-parallelism ("not X, it's Y") constructions, and general
  wordiness — this file has already been swept for these; don't reintroduce
  them.
- **Do not touch**: verbatim `quote` fields, and `references[].label`
  bibliographic formatting (`"Title — Source (Year)"` is this file's
  established, consistent citation convention, not a tic).
- Scope is rendered strings only. Code comments and repo docs
  (`AGENTS.md`, `docs/*.md`) are not part of "the site" and are out of scope
  for this pass.

## 7. Report, don't auto-commit

- For a small drift-fix pass, just make the mechanical fixes and summarize
  what changed. For anything larger (new presets, numeric changes, several
  discrepancies), report per-entity verdicts and proposed additions back to
  the user before finishing.
- Confirm `pnpm typecheck && pnpm test && pnpm build` all pass.
- Don't run `git commit` or `git push` unless the user explicitly asks.
