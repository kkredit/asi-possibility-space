import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Box, FormControl, MenuItem, Select, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { dataset } from '@model/dataset';
import type { Credences, Evaluator, FactorId, StateId, SubCredences, ValueVector } from '@model/types';
import {
  actionBeliefThreshold,
  actionConditions,
  actionContrastGrid,
  type ActionMetric,
  type MakeJoint,
  type RankedAction,
} from '@engine/index';
import type { Pins } from '@engine/scenarios';
import { Panel } from '@shell/Panel';
import { c, fonts, valueColor } from '@shell/theme';
import { ActionRanking } from '@viz/ActionRanking';
import { ConditionTornado } from '@viz/ConditionTornado';
import { ConditionHeatmap } from '@viz/ConditionHeatmap';
import { BeliefThreshold } from '@viz/BeliefThreshold';
import { ConditionList } from '@shell/tabs/ConditionList';
import { InfoTip } from '@viz/InfoTip';
import { VizHeading } from '@viz/VizHeading';

interface Props {
  credences: Credences;
  /** Sub-layer beliefs (present while the alignment deep-dive is deriving). */
  subCredences?: SubCredences;
  weights: ValueVector;
  evaluator: Evaluator;
  pins: Pins;
  /** Pre-computed action ranking from App (belief-model aware). */
  ranking: { baselineEv: number; ranked: RankedAction[] };
  /** Joint factory (net mode) so the conditions tools re-rake per action/sweep. */
  makeJoint?: MakeJoint;
}

/**
 * Everything about ACTIONS: which lever is best at your current beliefs (the ranking),
 * and — for a chosen action — under what conditions it's the best lever / how much it
 * helps on its own. Conditions are the objective factors (the exogenous facts no action
 * moves); this uses the independence×couplings model since actions move marginals.
 */
export function ActionsTab({ credences, subCredences, weights, evaluator, pins, ranking, makeJoint }: Props) {
  const [actionId, setActionId] = useState<string>(dataset.actions[0].id);
  const action = dataset.actions.find((a) => a.id === actionId)!;
  // 'gain' = absolute effect vs. doing nothing; 'margin' = vs. the best alternative.
  const [metric, setMetric] = useState<ActionMetric>('margin');

  const ac = useMemo(
    () => actionConditions(dataset, credences, weights, evaluator, action, pins, metric, subCredences, makeJoint),
    [credences, weights, evaluator, action, pins, metric, subCredences, makeJoint],
  );

  const [hmF1, hmF2] = useMemo(() => {
    const ids = ac.cruxes.map((x) => x.factorId);
    return [ids[0], ids[1]] as [string | undefined, string | undefined];
  }, [ac]);
  const grid = useMemo(
    () => (hmF1 && hmF2 ? actionContrastGrid(dataset, credences, weights, evaluator, action, hmF1, hmF2, pins, metric, subCredences, makeJoint) : null),
    [credences, weights, evaluator, action, pins, hmF1, hmF2, metric, subCredences, makeJoint],
  );
  const labelOf = (fid: string) => dataset.factors.find((f) => f.id === fid)?.label ?? fid;

  const sweepable = useMemo(() => dataset.factors.filter((f) => f.kind === 'objective'), []);
  const [sweep, setSweep] = useState<{ factor: FactorId; state: StateId } | null>(null);
  const sweepFactorId =
    sweep && sweepable.some((f) => f.id === sweep.factor)
      ? sweep.factor
      : ac.cruxes.find((x) => sweepable.some((f) => f.id === x.factorId))?.factorId ?? sweepable[0].id;
  const sweepFactor = dataset.factors.find((f) => f.id === sweepFactorId)!;
  const sweepStateId =
    sweep && sweep.factor === sweepFactorId && sweepFactor.states.some((s) => s.id === sweep.state)
      ? sweep.state
      : sweepFactor.states[0].id;
  const sweepStateLabel = sweepFactor.states.find((s) => s.id === sweepStateId)?.label ?? sweepStateId;
  // The 21-point sweep re-derives the objective-world grid per point — by far the
  // tab's most expensive block. Compute it after first paint and at deferred
  // priority so switching to this tab and dragging sliders stay responsive.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const deferredCredences = useDeferredValue(credences);
  const threshold = useMemo(
    () =>
      mounted
        ? actionBeliefThreshold(dataset, deferredCredences, weights, evaluator, action, sweepFactorId, sweepStateId, pins, metric, subCredences, makeJoint)
        : null,
    [mounted, deferredCredences, weights, evaluator, action, sweepFactorId, sweepStateId, pins, metric, subCredences, makeJoint],
  );

  const stateSelectSx = { fontFamily: fonts.display, fontSize: '0.84rem' };

  return (
    <>
      <Panel>
        <ActionRanking ranked={ranking.ranked} baselineEv={ranking.baselineEv} />
      </Panel>

      <Panel>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          <Typography variant="overline" sx={{ color: c.mute }}>Under what conditions is an action best?</Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5, mb: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <Select value={actionId} onChange={(e) => setActionId(e.target.value)} sx={stateSelectSx}>
              {dataset.actions.map((a) => (
                <MenuItem key={a.id} value={a.id} sx={stateSelectSx}>{a.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" sx={{ color: c.faint }}>measured vs</Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={metric}
            onChange={(_, v) => v && setMetric(v)}
            sx={{ '& .MuiToggleButton-root': { fontFamily: fonts.display, fontSize: '0.7rem', textTransform: 'none', py: 0.25, px: 1, color: c.mute } }}
          >
            <ToggleButton value="margin">best alternative</ToggleButton>
            <ToggleButton value="gain">doing nothing (absolute)</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Box sx={{ borderTop: `1px solid ${c.line}`, pt: 1.5 }}>
          <Typography variant="body2" sx={{ color: c.mute, mb: 0.5, display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap' }}>
            At your current beliefs, pursuing
            <Box component="span" sx={{ color: c.teal, mx: 0.5 }}>{action.label}</Box>
            is
            <InfoTip>
              For each setting of the <em>objective</em> factors (the exogenous facts no action can move),
              this action's conditional-mean EV gain is compared to the best alternative action (floored at
              doing nothing). "Best lever" = it beats every alternative there; the absolute view compares it
              to doing nothing. Actions move marginal beliefs, so this uses the independence×couplings model.
              {Object.keys(pins).length > 0 ? ` Holding fixed the ${Object.keys(pins).length} condition(s) you pinned in Beliefs.` : ''}
            </InfoTip>
          </Typography>
          <Stack direction="row" spacing={3} alignItems="baseline" flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontFamily: fonts.display, fontSize: '1.5rem', color: valueColor(Math.max(-1, Math.min(1, ac.mean * 3))) }}>
              {ac.mean >= 0 ? '+' : ''}{ac.mean.toFixed(3)}
              <Box component="span" sx={{ fontSize: '0.8rem', color: c.mute, ml: 0.75 }}>
                {metric === 'gain' ? 'mean EV gain (absolute)' : 'mean margin vs. next-best'}
              </Box>
            </Typography>
            <Typography sx={{ fontFamily: fonts.mono, fontSize: '1.05rem', color: c.bone }}>
              {(ac.favorableShare * 100).toFixed(0)}%
              <Box component="span" sx={{ fontSize: '0.78rem', color: c.mute, ml: 0.75 }}>
                {metric === 'gain' ? 'of objective worlds where it improves EV' : 'of objective worlds where it’s the best lever'}
              </Box>
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: c.faint, display: 'block', mt: 0.75 }}>
            On its own it improves EV in <Box component="span" sx={{ color: ac.positiveGainShare > 0.5 ? c.teal : c.mute }}>{(ac.positiveGainShare * 100).toFixed(0)}%</Box> of worlds
            (mean {ac.meanGain >= 0 ? '+' : ''}{ac.meanGain.toFixed(3)}) · the single best lever in {(ac.bestLeverShare * 100).toFixed(0)}%.
            {ac.positiveGainShare > 0.9 && ac.bestLeverShare < 0.5 ? ' Helpful almost everywhere — just usually not the top priority, not harmful.' : ''}
          </Typography>
        </Box>
      </Panel>

      <Panel>
        <ConditionTornado rows={ac.cruxes} decisionLabel={`pursuing ${action.label.toLowerCase()}`} />
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 2 }}>
          <ConditionList title={metric === 'gain' ? 'HELPS MOST WHEN' : 'BEST LEVER WHEN'} color={c.teal} lines={ac.favorableWhen} sign="+" />
          <ConditionList title={metric === 'gain' ? 'HELPS LEAST / HARMFUL WHEN' : 'NOT THE PRIORITY WHEN'} color={c.red} lines={ac.unfavorableWhen} sign="" />
        </Box>
      </Panel>

      {grid ? (
        <Panel>
          <ConditionHeatmap
            data={{ f1Label: labelOf(grid.f1), f2Label: labelOf(grid.f2), rows: grid.rows, cols: grid.cols, cells: grid.cells, maxAbs: grid.maxAbs }}
          />
        </Panel>
      ) : null}

      <Panel>
        <VizHeading
          title="How sure would you need to be?"
          info={
            <>
              Sweeps your credence in one objective factor-state from 0 to 100% and traces the{' '}
              {metric === 'gain' ? "action's absolute EV gain vs. doing nothing" : "action's mean margin over the next-best alternative"},
              marking the break-even credence where the verdict flips. Uses the independence model.
            </>
          }
        />
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5, mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: c.mute }}>credence in</Typography>
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <Select
              value={sweepFactorId}
              onChange={(e) => {
                const f = dataset.factors.find((x) => x.id === e.target.value)!;
                setSweep({ factor: f.id, state: f.states[0].id });
              }}
              sx={stateSelectSx}
            >
              {sweepable.map((f) => (
                <MenuItem key={f.id} value={f.id} sx={stateSelectSx}>{f.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography sx={{ color: c.faint, fontFamily: fonts.body }}>=</Typography>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={sweepStateId} onChange={(e) => setSweep({ factor: sweepFactorId, state: e.target.value })} sx={stateSelectSx}>
              {sweepFactor.states.map((s) => (
                <MenuItem key={s.id} value={s.id} sx={stateSelectSx}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <BeliefThreshold data={threshold} factorLabel={sweepFactor.label} stateLabel={sweepStateLabel} />
      </Panel>
    </>
  );
}
