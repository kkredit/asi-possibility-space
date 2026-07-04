import { useMemo, useState } from 'react';
import { Box, Container, Paper, Tab, Tabs, Typography, useMediaQuery, useTheme } from '@mui/material';
import { dataset } from '@model/dataset';
import {
  analyze,
  cachedEvaluator,
  disempowermentMass,
  distribution,
  doomMass,
  flourishingMass,
  evaluatorFit,
  evaluators,
  fittedLinearEvaluator,
  getEvaluator,
  rankActions,
  reconcileJoint,
  scalarize,
  shiftedCredences,
  zeroVector,
} from '@engine/index';
import { Controls } from '@shell/controls/Controls';
import { BeliefsSheet } from '@shell/BeliefsSheet';
import { EvHeadline } from '@shell/EvHeadline';
import { Logo } from '@shell/Logo';
import { setHashParam, useBeliefs } from '@shell/store';
import { c, fonts } from '@shell/theme';
import { EVDistribution } from '@viz/EVDistribution';
import { ScenarioTable } from '@viz/ScenarioTable';
import { ParallelCoordinates } from '@viz/ParallelCoordinates';
import { EvaluatorDiff, type DiffPoint } from '@viz/EvaluatorDiff';
import { ModelLadder, type LadderRow } from '@viz/ModelLadder';
import { Panel } from '@shell/Panel';
import { ActionsTab } from '@shell/tabs/ActionsTab';
import { AboutPage } from '@shell/pages/AboutPage';
import { ResourcesPage } from '@shell/pages/ResourcesPage';
import { DisclaimersPage } from '@shell/pages/DisclaimersPage';
import { FactorsTab } from '@shell/tabs/FactorsTab';

// The full scenario-space size, derived so it never goes stale as factors change.
const SCENARIO_COUNT = dataset.factors.reduce((n, f) => n * f.states.length, 1);

// Tabs with their URL slugs (one array so label and slug can't drift apart);
// the active tab is `#tab=<slug>`-linkable.
const TABS = [
  { label: 'Landscape', slug: 'landscape' },
  { label: 'Actions', slug: 'actions' },
  { label: 'Factors', slug: 'factors' },
  { label: 'Scenarios', slug: 'scenarios' },
  { label: 'Evaluators', slug: 'evaluators' },
] as const;

function readUrlTab(): number {
  if (typeof window === 'undefined') return 0;
  const slug = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('tab');
  const i = slug ? TABS.findIndex((t) => t.slug === slug) : -1;
  return i >= 0 ? i : 0;
}

// Top-level pages, hash-navigable (`#page=about` / `#page=resources`) — the app
// deliberately has no client-side router (see AGENTS.md), so pages follow the same
// hash-param pattern as tabs and presets.
const PAGES = ['explorer', 'about', 'resources', 'disclaimers'] as const;
type Page = (typeof PAGES)[number];

function readUrlPage(): Page {
  if (typeof window === 'undefined') return 'explorer';
  const p = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('page');
  return p === 'about' || p === 'resources' || p === 'disclaimers' ? p : 'explorer';
}

function Masthead({ page, onNavigate }: { page: Page; onNavigate: (p: Page) => void }) {
  const navLink = (p: Page, label: string) => (
    <Typography
      key={p}
      onClick={() => onNavigate(p)}
      sx={{
        fontFamily: fonts.display,
        fontSize: '0.82rem',
        fontWeight: page === p ? 700 : 400,
        color: page === p ? c.accent : c.mute,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        '&:hover': { color: c.accent },
      }}
    >
      {label}
    </Typography>
  );
  return (
    <Box
      component="header"
      sx={{
        borderBottom: `1px solid ${c.line}`,
        px: { xs: 2, sm: 3 },
        py: 1.75,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: { xs: 1, sm: 2 },
        rowGap: 0.5,
      }}
    >
      {/* Logo + wordmark are one unit: the mark is centered on the title/tagline
          stack so it stays locked to the title instead of drifting when the row wraps. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
        <Logo size={30} />
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em', color: c.bone, lineHeight: 1.15 }}>
            ASI&nbsp;Possibility&nbsp;Space
          </Typography>
          <Typography sx={{ fontFamily: fonts.display, fontSize: '0.82rem', color: c.mute, fontWeight: 400, lineHeight: 1.2 }}>
            an instrument for reasoning about AI&nbsp;futures
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', ml: { xs: 0, sm: 2 } }}>
        {navLink('explorer', 'Explorer')}
        {navLink('about', 'About')}
        {navLink('resources', 'Resources')}
        {navLink('disclaimers', 'Disclaimers')}
      </Box>
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontFamily: fonts.mono, fontSize: '0.68rem', color: c.faint, whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}>
        {SCENARIO_COUNT.toLocaleString()}-scenario model
      </Typography>
    </Box>
  );
}

export function App() {
  const credences = useBeliefs((s) => s.credences);
  const weights = useBeliefs((s) => s.weights);
  const evaluatorId = useBeliefs((s) => s.evaluatorId);
  const pins = useBeliefs((s) => s.pins);
  const probabilityModel = useBeliefs((s) => s.probabilityModel);
  const bayesProbability = useBeliefs((s) => s.bayesProbability);
  const subCredencesState = useBeliefs((s) => s.subCredences);
  const alignmentMode = useBeliefs((s) => s.alignmentMode);
  // Sub-layer beliefs drive the research-area actions only while derived.
  const subCredences = alignmentMode === 'derived' ? subCredencesState : undefined;
  const [tab, setTab] = useState(readUrlTab);
  const selectTab = (i: number) => {
    setTab(i);
    // Omit the default (Landscape) so plain / preset-only links stay clean.
    setHashParam('tab', i > 0 ? TABS[i].slug : null);
  };
  const [page, setPage] = useState<Page>(readUrlPage);
  const selectPage = (p: Page) => {
    setPage(p);
    setHashParam('page', p === 'explorer' ? null : p);
  };

  // Mobile: the Beliefs panel is a bottom sheet instead of a huge in-flow column
  // (results-first; see BeliefsSheet). Desktop keeps the sticky side panel.
  const isMobile = useMediaQuery(useTheme().breakpoints.down('md'));

  const evaluator = getEvaluator(evaluatorId);
  // In Bayes-net mode the reconciled joint drives every analysis (it can't be
  // factored back into independent marginals); in independence mode it's undefined
  // and analyze falls back to the credences × couplings path.
  const jointProbability = probabilityModel === 'bayesNet' ? bayesProbability ?? undefined : undefined;
  const netMode = probabilityModel === 'bayesNet';
  // Joint FACTORY for the conditions/threshold/action tools, which perturb credences
  // (sweep a marginal, apply an action) and so must re-rake per configuration rather
  // than reuse a stale joint. Undefined in independence mode (analyze falls back to
  // credences × couplings). Memoized so the tools' single-render memos stay warm.
  const makeJoint = useMemo(
    () =>
      netMode && dataset.bayesNet
        ? (c: typeof credences) => reconcileJoint(dataset.bayesNet!, dataset.factors, c, c).probability
        : undefined,
    [netMode],
  );

  const analysis = useMemo(
    () => analyze(dataset, credences, weights, evaluator, pins, jointProbability),
    [credences, weights, evaluator, pins, jointProbability],
  );
  // Tab-gated memos: only the active tab's expensive derived data is computed, so
  // dragging a belief slider re-runs the headline analysis plus ONE tab's work —
  // not the ranking + scatter + ladder for tabs that aren't visible.
  const bins = useMemo(() => (tab === 0 ? distribution(analysis.scenarios) : null), [analysis, tab]);
  // Modeled p(doom): probability mass on extinction-level outcomes (survival < −0.5).
  // A different summary than EV — the extinction tail, not a cross-dimension average.
  const pDoom = useMemo(() => doomMass(analysis.scenarios), [analysis]);
  // Alive-but-disempowered mass: the "p(pets)" band — survives, but the future is
  // no longer ours (subjugated takeover, hard lock-in).
  const pDisempowered = useMemo(() => disempowermentMass(analysis.scenarios), [analysis]);
  // Flourishing mass: the good tail — mirror of p(doom).
  const pFlourishing = useMemo(() => flourishingMass(analysis.scenarios), [analysis]);
  // Standalone (linear) value pull of each factor-state, for the distribution
  // tooltip's valence glyphs. Recomputed when weights change.
  const stateValence = useMemo(() => {
    if (tab !== 0) return undefined;
    const m: Record<string, Record<string, number>> = {};
    for (const f of dataset.factors) {
      m[f.id] = {};
      for (const st of f.states) {
        const partial = dataset.linearContributions[f.id]?.[st.id] ?? {};
        m[f.id][st.id] = scalarize({ ...zeroVector(), ...partial }, weights);
      }
    }
    return m;
  }, [weights, tab]);
  const actions = useMemo(() => {
    if (tab !== 1) return null;
    if (!netMode || !dataset.bayesNet) return rankActions(dataset, credences, weights, evaluator, pins, subCredences);
    // Net mode: apply the action to the credence marginals (through the sub-layer
    // when it's active), then re-rake the net's correlation structure to the
    // shifted marginals so the effect propagates.
    const baselineEv = analysis.ev;
    const ranked = dataset.actions
      .map((action) => {
        const shifted = shiftedCredences(dataset, credences, action, subCredences);
        const r = reconcileJoint(dataset.bayesNet!, dataset.factors, shifted, shifted);
        const res = analyze(dataset, credences, weights, evaluator, pins, r.probability);
        return { action, ev: res.ev, evGain: res.ev - baselineEv, evVector: res.evVector };
      })
      .sort((a, b) => b.evGain - a.evGain);
    return { baselineEv, ranked };
  }, [tab, netMode, credences, weights, evaluator, pins, analysis, subCredences]);
  // The scatter plots a comparison model (x) against the hand-reasoned surface (y).
  // Comparing cached-vs-cached is a useless diagonal, so when cached is selected we
  // fall back to the fitted additive model — the honest null model.
  const compareEvaluator = evaluator.id === cachedEvaluator.id ? fittedLinearEvaluator : evaluator;
  const diffPoints = useMemo<DiffPoint[] | null>(
    () =>
      tab !== 4
        ? null
        : analysis.scenarios.map((s) => ({
        linear: scalarize(compareEvaluator.evaluate(s.scenario, dataset)!.value, weights),
        cached: scalarize(cachedEvaluator.evaluate(s.scenario, dataset)!.value, weights),
        probability: s.probability,
            reasoned: s.reasoned,
          })),
    [analysis, weights, compareEvaluator, tab],
  );

  // The model ladder: every value model's RMS divergence from the cached surface,
  // worst fit first. Cached is the zero reference. Recomputed when weights change
  // (the scalar RMS depends on them; the vector RMS doesn't).
  const ladder = useMemo<LadderRow[] | null>(() => {
    if (tab !== 4) return null;
    const NOTES: Record<string, string> = {
      cached: 'The hand-reasoned surface itself — the reference every model is measured against.',
      fittedPairwise: 'Every two-way interaction, fit by least squares. Captures pairwise structure but still misses the higher-order régime gating — so it now trails the archetype despite far more parameters.',
      archetype: 'Twelve logical régimes — the four archetypes split by deception, with takeover régimes further split by severity (extermination vs subjugation) — predicting each régime’s mean value. Zero hand-tuning, yet it’s the single best fit: it beats even the 261-parameter pairwise model, because the surface’s sharpest structure is gated (deceptive defection collapses a world to ≈ doom; severity decides whether the takeover ends us) in ways only a gate can represent.',
      fitted: 'Best possible interaction-free fit. Its residual is the irreducible non-linearity — what no sum-of-factors can capture.',
    };
    return evaluators
      .map((e) => {
        const fit = evaluatorFit(dataset, e, weights);
        return {
          id: e.id,
          label: e.label,
          rms: e.id === cachedEvaluator.id ? 0 : fit.scalarRms,
          note: NOTES[e.id],
          reference: e.id === cachedEvaluator.id,
        };
      })
      .sort((a, b) => b.rms - a.rms);
  }, [weights, tab]);

  if (page !== 'explorer') {
    return (
      <Box sx={{ minHeight: '100vh' }}>
        <Masthead page={page} onNavigate={selectPage} />
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 } }}>
          {page === 'about' ? <AboutPage /> : page === 'resources' ? <ResourcesPage /> : <DisclaimersPage />}
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Masthead page={page} onNavigate={selectPage} />

      <Container maxWidth="xl" sx={{ pt: { xs: 2, sm: 3 }, pb: { xs: 10, md: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-start' }}>
          {!isMobile && (
            <Paper
              sx={{
                p: 2.25,
                width: 360,
                flexShrink: 0,
                position: 'sticky',
                top: 16,
                maxHeight: 'calc(100vh - 32px)',
                overflowY: 'auto',
              }}
            >
              <Controls />
            </Paper>
          )}

          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <EvHeadline ev={analysis.ev} evVector={analysis.evVector} pDoom={pDoom} pDisempowered={pDisempowered} pFlourishing={pFlourishing} />
            </Box>

            <Box sx={{ borderBottom: `1px solid ${c.line}`, mb: 2 }}>
              <Tabs value={tab} onChange={(_, v) => selectTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                {TABS.map(({ label, slug }) => (
                  <Tab key={slug} label={label} />
                ))}
              </Tabs>
            </Box>

            {tab === 0 && (
              <>
                <Panel>
                  <EVDistribution bins={bins!} ev={analysis.ev} factors={dataset.factors} valence={stateValence} />
                </Panel>
                <Panel>
                  <ParallelCoordinates scenarios={analysis.scenarios} factors={dataset.factors} />
                </Panel>
              </>
            )}

            {tab === 1 && (
              <ActionsTab
                subCredences={subCredences}
                credences={credences}
                weights={weights}
                evaluator={evaluator}
                pins={pins}
                ranking={actions!}
                makeJoint={makeJoint}
              />
            )}

            {tab === 2 && (
              <FactorsTab
                subCredences={subCredences}
                credences={credences}
                weights={weights}
                evaluator={evaluator}
                pins={pins}
                jointProbability={jointProbability}
                makeJoint={makeJoint}
              />
            )}

            {tab === 3 && (
              <Panel>
                <ScenarioTable scenarios={analysis.scenarios} factors={dataset.factors} />
              </Panel>
            )}

            {tab === 4 && (
              <>
                <Panel>
                  <ModelLadder
                    rows={ladder!}
                    info={
                      <>
                        Each model is fit to (or hand-set against) the same hand-reasoned cells. The drop
                        from <em>linear</em> to <em>fitted linear</em> is coefficients the hand-set model got
                        wrong; <em>fitted + pairwise</em> adds two-way interaction — yet <em>logical gates</em>
                        beats it at a fraction of the parameters, because the surface is gated (régimes), not
                        additive. See docs/MODEL.md.
                      </>
                    }
                  />
                </Panel>
                <Panel>
                  <EvaluatorDiff
                    points={diffPoints!}
                    model={compareEvaluator.label}
                    xLabel={`${compareEvaluator.label} value →`}
                    info={
                      <>
                        Each dot is a scenario at its <strong>{compareEvaluator.label.toLowerCase()}</strong> value
                        (x) vs. hand-reasoned value (y). Distance from the dashed diagonal is where that model
                        departs from careful reasoning — pick a different evaluator at left to compare it.
                      </>
                    }
                  />
                </Panel>
              </>
            )}

          </Box>
        </Box>
      </Container>

      {isMobile && <BeliefsSheet ev={analysis.ev} pDoom={pDoom} pDisempowered={pDisempowered} pFlourishing={pFlourishing} />}
    </Box>
  );
}
