import { useMemo, useState } from 'react';
import { Box, Container, Paper, Tab, Tabs, Typography } from '@mui/material';
import { dataset } from '@model/dataset';
import {
  analyze,
  cachedEvaluator,
  distribution,
  evaluatorFit,
  evaluators,
  getEvaluator,
  linearEvaluator,
  rankActions,
  scalarize,
  sensitivity,
} from '@engine/index';
import { Controls } from '@shell/controls/Controls';
import { EvHeadline } from '@shell/EvHeadline';
import { Logo } from '@shell/Logo';
import { useBeliefs } from '@shell/store';
import { c, fonts } from '@shell/theme';
import { EVDistribution } from '@viz/EVDistribution';
import { Tornado } from '@viz/Tornado';
import { ActionRanking } from '@viz/ActionRanking';
import { ScenarioTable } from '@viz/ScenarioTable';
import { ParallelCoordinates } from '@viz/ParallelCoordinates';
import { EvaluatorDiff, type DiffPoint } from '@viz/EvaluatorDiff';
import { ModelLadder, type LadderRow } from '@viz/ModelLadder';

function Panel({ children }: { children: React.ReactNode }) {
  return <Paper sx={{ p: { xs: 1.75, sm: 2.5 }, mb: 2 }}>{children}</Paper>;
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
      <Logo size={26} />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: { xs: 0.75, sm: 1.5 }, rowGap: 0 }}>
        <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em', color: c.bone }}>
          ASI&nbsp;Possibility&nbsp;Space
        </Typography>
        <Typography sx={{ fontFamily: fonts.display, fontSize: '0.84rem', color: c.mute, fontWeight: 400 }}>
          an instrument for reasoning about AI&nbsp;futures
        </Typography>
      </Box>
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontFamily: fonts.mono, fontSize: '0.68rem', color: c.faint, whiteSpace: 'nowrap' }}>
        432 scenarios · presumed first-pass model
      </Typography>
    </Box>
  );
}

export function App() {
  const credences = useBeliefs((s) => s.credences);
  const weights = useBeliefs((s) => s.weights);
  const evaluatorId = useBeliefs((s) => s.evaluatorId);
  const pins = useBeliefs((s) => s.pins);
  const [tab, setTab] = useState(0);

  const evaluator = getEvaluator(evaluatorId);

  const analysis = useMemo(
    () => analyze(dataset, credences, weights, evaluator, pins),
    [credences, weights, evaluator, pins],
  );
  const bins = useMemo(() => distribution(analysis.scenarios), [analysis]);
  const sens = useMemo(
    () => sensitivity(dataset, credences, weights, evaluator, pins),
    [credences, weights, evaluator, pins],
  );
  const actions = useMemo(
    () => rankActions(dataset, credences, weights, evaluator, pins),
    [credences, weights, evaluator, pins],
  );
  // The scatter plots a comparison model (x) against the hand-reasoned surface (y).
  // Comparing cached-vs-cached is a useless diagonal, so when cached is selected we
  // fall back to the hand-set linear model (the original default view).
  const compareEvaluator = evaluator.id === cachedEvaluator.id ? linearEvaluator : evaluator;
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
      fittedPairwise: 'Best fit with two-way interactions. Its residual is genuinely higher-than-pairwise (3-way+) structure.',
      archetype: 'Four logical buckets (benign / aligned / control / doom), each predicting its mean value. Zero hand-tuning — yet it beats the fitted additive model, which means the surface is gated, not additive.',
      fitted: 'Best possible interaction-free fit. Its residual is the irreducible non-linearity — what no sum-of-factors can capture.',
      linear: 'Hand-set additive coefficients. Its extra gap over the fitted model is just suboptimal coefficients, not real structure.',
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
              <EvHeadline ev={analysis.ev} evVector={analysis.evVector} />
            </Box>

            <Box sx={{ borderBottom: `1px solid ${c.line}`, mb: 2 }}>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
                <Tab label="Landscape" />
                <Tab label="Where to act" />
                <Tab label="Scenarios" />
                <Tab label="Evaluators" />
              </Tabs>
            </Box>

            {tab === 0 && (
              <>
                <Panel>
                  <EVDistribution bins={bins} ev={analysis.ev} />
                </Panel>
                <Panel>
                  <ParallelCoordinates scenarios={analysis.scenarios} factors={dataset.factors} />
                </Panel>
              </>
            )}

            {tab === 1 && (
              <>
                <Panel>
                  <ActionRanking ranked={actions.ranked} baselineEv={actions.baselineEv} />
                </Panel>
                <Panel>
                  <Tornado rows={sens} />
                </Panel>
              </>
            )}

            {tab === 2 && (
              <Panel>
                <ScenarioTable scenarios={analysis.scenarios} factors={dataset.factors} />
              </Panel>
            )}

            {tab === 3 && (
              <>
                <Panel>
                  <ModelLadder rows={ladder} />
                  <Typography variant="body2" sx={{ mt: 2, color: c.mute, maxWidth: 620 }}>
                    Each model is fit to (or hand-set against) the same hand-reasoned cells. The drop
                    from <em>linear</em> to <em>fitted linear</em> is coefficients the hand-set model got
                    wrong; the drop to <em>fitted + pairwise</em> is two-way interaction; what remains is
                    genuinely higher-order entanglement (the hard logical gates). See{' '}
                    <Box component="span" sx={{ fontFamily: fonts.mono, color: c.bone }}>docs/MODEL.md</Box>.
                  </Typography>
                </Panel>
                <Panel>
                  <EvaluatorDiff points={diffPoints} model={compareEvaluator.label} xLabel={`${compareEvaluator.label} value →`} />
                  <Typography variant="body2" sx={{ mt: 2, color: c.mute, maxWidth: 620 }}>
                    Each dot is a scenario at its <strong>{compareEvaluator.label.toLowerCase()}</strong> value
                    (x) vs. hand-reasoned value (y). Distance from the dashed diagonal is where that model
                    departs from careful reasoning — pick a different evaluator at left to compare it.
                  </Typography>
                </Panel>
              </>
            )}

            <Typography sx={{ mt: 1, color: c.faint, fontSize: '0.72rem', fontFamily: fonts.body }}>
              Every factor, probability, outcome and weight is a presumed first-pass default — edit{' '}
              <Box component="code" sx={{ fontFamily: fonts.mono, color: c.mute }}>src/model/dataset.ts</Box> to
              refine. See <Box component="code" sx={{ fontFamily: fonts.mono, color: c.mute }}>docs/DESIGN.md</Box>.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
