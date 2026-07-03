import { useMemo, useState } from 'react';
import { Box, Container, Paper, Tab, Tabs, Typography } from '@mui/material';
import { dataset } from '@model/dataset';
import {
  analyze,
  applyAction,
  cachedEvaluator,
  distribution,
  doomMass,
  evaluatorFit,
  evaluators,
  fittedLinearEvaluator,
  getEvaluator,
  rankActions,
  reconcileJoint,
  scalarize,
  zeroVector,
} from '@engine/index';
import { Controls } from '@shell/controls/Controls';
import { EvHeadline } from '@shell/EvHeadline';
import { Logo } from '@shell/Logo';
import { setHashParam, useBeliefs } from '@shell/store';
import { c, fonts } from '@shell/theme';
import { EVDistribution } from '@viz/EVDistribution';
import { ScenarioTable } from '@viz/ScenarioTable';
import { ParallelCoordinates } from '@viz/ParallelCoordinates';
import { EvaluatorDiff, type DiffPoint } from '@viz/EvaluatorDiff';
import { ModelLadder, type LadderRow } from '@viz/ModelLadder';
import { InfoTip } from '@viz/InfoTip';
import { Panel } from '@shell/Panel';
import { ActionsTab } from '@shell/tabs/ActionsTab';
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

function Masthead() {
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
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontFamily: fonts.mono, fontSize: '0.68rem', color: c.faint, whiteSpace: 'nowrap' }}>
        {SCENARIO_COUNT.toLocaleString()}-scenario model · editable content
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
  const [tab, setTab] = useState(readUrlTab);
  const selectTab = (i: number) => {
    setTab(i);
    // Omit the default (Landscape) so plain / preset-only links stay clean.
    setHashParam('tab', i > 0 ? TABS[i].slug : null);
  };

  const evaluator = getEvaluator(evaluatorId);
  // In Bayes-net mode the reconciled joint drives every analysis (it can't be
  // factored back into independent marginals); in independence mode it's undefined
  // and analyze falls back to the credences × couplings path.
  const jointProbability = probabilityModel === 'bayesNet' ? bayesProbability ?? undefined : undefined;
  const netMode = probabilityModel === 'bayesNet';

  const analysis = useMemo(
    () => analyze(dataset, credences, weights, evaluator, pins, jointProbability),
    [credences, weights, evaluator, pins, jointProbability],
  );
  const bins = useMemo(() => distribution(analysis.scenarios), [analysis]);
  // Modeled p(doom): probability mass on extinction-level outcomes (survival < −0.5).
  // A different summary than EV — the extinction tail, not a cross-dimension average.
  const pDoom = useMemo(() => doomMass(analysis.scenarios), [analysis]);
  // Standalone (linear) value pull of each factor-state, for the distribution
  // tooltip's valence glyphs. Recomputed when weights change.
  const stateValence = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const f of dataset.factors) {
      m[f.id] = {};
      for (const st of f.states) {
        const partial = dataset.linearContributions[f.id]?.[st.id] ?? {};
        m[f.id][st.id] = scalarize({ ...zeroVector(), ...partial }, weights);
      }
    }
    return m;
  }, [weights]);
  const actions = useMemo(() => {
    if (!netMode || !dataset.bayesNet) return rankActions(dataset, credences, weights, evaluator, pins);
    // Net mode: apply the action to the credence marginals, then re-rake the net's
    // correlation structure to the shifted marginals so the effect propagates.
    const baselineEv = analysis.ev;
    const ranked = dataset.actions
      .map((action) => {
        const shifted = applyAction(credences, action);
        const r = reconcileJoint(dataset.bayesNet!, dataset.factors, shifted, shifted);
        const res = analyze(dataset, credences, weights, evaluator, pins, r.probability);
        return { action, ev: res.ev, evGain: res.ev - baselineEv, evVector: res.evVector };
      })
      .sort((a, b) => b.evGain - a.evGain);
    return { baselineEv, ranked };
  }, [netMode, credences, weights, evaluator, pins, analysis]);
  // The scatter plots a comparison model (x) against the hand-reasoned surface (y).
  // Comparing cached-vs-cached is a useless diagonal, so when cached is selected we
  // fall back to the fitted additive model — the honest null model.
  const compareEvaluator = evaluator.id === cachedEvaluator.id ? fittedLinearEvaluator : evaluator;
  const diffPoints = useMemo<DiffPoint[]>(
    () =>
      analysis.scenarios.map((s) => ({
        linear: scalarize(compareEvaluator.evaluate(s.scenario, dataset)!.value, weights),
        cached: scalarize(cachedEvaluator.evaluate(s.scenario, dataset)!.value, weights),
        probability: s.probability,
        reasoned: s.reasoned,
      })),
    [analysis, weights, compareEvaluator],
  );

  // The model ladder: every value model's RMS divergence from the cached surface,
  // worst fit first. Cached is the zero reference. Recomputed when weights change
  // (the scalar RMS depends on them; the vector RMS doesn't).
  const ladder = useMemo<LadderRow[]>(() => {
    const NOTES: Record<string, string> = {
      cached: 'The hand-reasoned surface itself — the reference every model is measured against.',
      fittedPairwise: 'Every two-way interaction, fit by least squares. Captures pairwise structure but still misses the higher-order régime gating — so it now trails the archetype despite far more parameters.',
      archetype: 'Eight logical régimes — the four archetypes (benign / aligned / control / doom) each split by whether deception holds — predicting each régime’s mean value. Zero hand-tuning, yet it’s the single best fit: it beats even the 217-parameter pairwise model, because the surface’s sharpest structure is a régime collapse (a deceptive defection turns an aligned/controlled world into ≈ doom) that only a gate can represent.',
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
  }, [weights]);

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <Masthead />

      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-start' }}>
          <Paper
            sx={{
              p: { xs: 1.75, sm: 2.25 },
              width: { xs: '100%', md: 360 },
              flexShrink: 0,
              position: { md: 'sticky' },
              top: { md: 16 },
              maxHeight: { md: 'calc(100vh - 32px)' },
              overflowY: { md: 'auto' },
            }}
          >
            <Controls />
          </Paper>

          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <EvHeadline ev={analysis.ev} evVector={analysis.evVector} pDoom={pDoom} />
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
                  <EVDistribution bins={bins} ev={analysis.ev} factors={dataset.factors} valence={stateValence} />
                </Panel>
                <Panel>
                  <ParallelCoordinates scenarios={analysis.scenarios} factors={dataset.factors} />
                </Panel>
              </>
            )}

            {tab === 1 && (
              <ActionsTab
                credences={credences}
                weights={weights}
                evaluator={evaluator}
                pins={pins}
                ranking={actions}
              />
            )}

            {tab === 2 && (
              <FactorsTab
                credences={credences}
                weights={weights}
                evaluator={evaluator}
                pins={pins}
                jointProbability={jointProbability}
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
                    rows={ladder}
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
                    points={diffPoints}
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

            <Typography sx={{ mt: 1, color: c.faint, fontSize: '0.72rem', fontFamily: fonts.body, display: 'inline-flex', alignItems: 'center' }}>
              Editable model
              <InfoTip>
                Every factor, probability, outcome and weight is authored content — a considered
                estimate, not ground truth. Edit{' '}
                <Box component="code" sx={{ fontFamily: fonts.mono, color: c.bone }}>src/model/dataset.ts</Box> to
                refine it; see <Box component="code" sx={{ fontFamily: fonts.mono, color: c.bone }}>docs/DESIGN.md</Box> for the design decisions behind it.
              </InfoTip>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
