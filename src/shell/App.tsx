import { useMemo, useState } from 'react';
import {
  AppBar,
  Alert,
  Box,
  Container,
  Paper,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from '@mui/material';
import { dataset } from '@model/dataset';
import {
  analyze,
  cachedEvaluator,
  distribution,
  getEvaluator,
  linearEvaluator,
  rankActions,
  scalarize,
  sensitivity,
} from '@engine/index';
import { Controls } from '@shell/controls/Controls';
import { EvHeadline } from '@shell/EvHeadline';
import { useBeliefs } from '@shell/store';
import { EVDistribution } from '@viz/EVDistribution';
import { Tornado } from '@viz/Tornado';
import { ActionRanking } from '@viz/ActionRanking';
import { ScenarioTable } from '@viz/ScenarioTable';
import { ParallelCoordinates } from '@viz/ParallelCoordinates';
import { EvaluatorDiff, type DiffPoint } from '@viz/EvaluatorDiff';

function Panel({ children }: { children: React.ReactNode }) {
  return <Paper sx={{ p: 2, mb: 2 }}>{children}</Paper>;
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
  const diffPoints = useMemo<DiffPoint[]>(
    () =>
      analysis.scenarios.map((s) => ({
        linear: scalarize(linearEvaluator.evaluate(s.scenario, dataset)!.value, weights),
        cached: scalarize(cachedEvaluator.evaluate(s.scenario, dataset)!.value, weights),
        probability: s.probability,
        reasoned: s.reasoned,
      })),
    [analysis, weights],
  );

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>
            AI Safety Possibility-Space Explorer
          </Typography>
          <Typography variant="caption" color="text.secondary">
            POC · presumed first-pass content
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Every factor, probability, outcome and weight below is a <strong>presumed first-pass
          default</strong>, not a locked-in choice — edit <code>src/model/dataset.ts</code> to refine
          the model. See <code>docs/DESIGN.md</code> §5/§9.
        </Alert>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-start' }}>
          <Paper sx={{ p: 2, width: { xs: '100%', md: 380 }, flexShrink: 0, position: { md: 'sticky' }, top: { md: 16 } }}>
            <Controls />
          </Paper>

          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <EvHeadline ev={analysis.ev} evVector={analysis.evVector} />
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
              <Tab label="Landscape" />
              <Tab label="Where to act" />
              <Tab label="Scenarios" />
              <Tab label="Evaluators" />
            </Tabs>

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
              <Panel>
                <EvaluatorDiff points={diffPoints} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Each dot is a scenario placed at its linear value (x) vs. hand-reasoned value (y);
                  gold dots are authored cells, grey are linear fallbacks (on the diagonal by
                  construction). Distance from the dashed diagonal is where careful reasoning departs
                  from the simple additive model — the research signal for refining the dataset.
                </Typography>
              </Panel>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
