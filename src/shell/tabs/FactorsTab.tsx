import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Box, FormControl, MenuItem, Select, Stack, Typography } from '@mui/material';
import { dataset } from '@model/dataset';
import type { Credences, Evaluator, FactorId, Scenario, StateId, SubCredences, ValueDimensionId, ValueVector } from '@model/types';
import { beliefThreshold, conditionalContrast, contrastGrid, sensitivity, subfactorSensitivity, zeroVector, type Decision, type MakeJoint } from '@engine/index';
import type { Pins } from '@engine/scenarios';
import { Panel } from '@shell/Panel';
import { c, fonts, valueColor } from '@shell/theme';
import { Tornado } from '@viz/Tornado';
import { ConditionTornado } from '@viz/ConditionTornado';
import { ConditionHeatmap } from '@viz/ConditionHeatmap';
import { BeliefThreshold } from '@viz/BeliefThreshold';
import { ConditionList } from '@shell/tabs/ConditionList';
import { InfoTip } from '@viz/InfoTip';
import { VizHeading } from '@viz/VizHeading';
import { DEV_TOOLS } from '@shell/devTools';

interface Props {
  credences: Credences;
  /** Sub-layer beliefs (present while the alignment deep-dive is deriving). */
  subCredences?: SubCredences;
  weights: ValueVector;
  evaluator: Evaluator;
  pins: Pins;
  jointProbability?: (s: Scenario) => number;
  /** Joint factory (net mode) for the tools that perturb credences. */
  makeJoint?: MakeJoint;
}

// The design doc's canonical opening question — "is open-sourcing the frontier
// favorable?" — as the initial contrast. Content ids; if the factor or its states
// are renamed in ids.ts/dataset.ts, update here too.
const DEFAULT_DECISION: Decision = { factor: 'powerConcentration', toward: 'diffuse', baseline: 'concentrated' };

/**
 * Everything about FACTORS: how much your EV hinges on each factor (the sensitivity
 * tornado — value of information / leverage / situational awareness), and — for a
 * chosen factor-state — under what conditions it's favorable (the interventional
 * contrast, its cruxes, favorable-when lists, two-way map and break-even sweep).
 */
export function FactorsTab({ credences, subCredences, weights, evaluator, pins, jointProbability, makeJoint }: Props) {
  // ── sensitivity tornado (measurable on weighted EV or a single value dimension) ─
  const [sensDim, setSensDim] = useState<'weighted' | ValueDimensionId>('weighted');
  const sensWeights = useMemo(
    () => (sensDim === 'weighted' ? weights : { ...zeroVector(), [sensDim]: 1 }),
    [sensDim, weights],
  );
  const sensMeasureLabel = sensDim === 'weighted' ? 'expected value' : dataset.valueDimensions.find((d) => d.id === sensDim)!.label.toLowerCase();
  const sens = useMemo(() => {
    const factorRows = sensitivity(dataset, credences, sensWeights, evaluator, pins, jointProbability);
    // With the deep dive active, the subfactors join the tornado (their swing is
    // computed by pinning each sub-state and re-deriving the parents). Note the
    // sub-rows use the independence path — the pinned derived marginals can't be
    // re-raked per-row without recomputing the joint 20+ times per render.
    const subRows = subCredences
      ? subfactorSensitivity(dataset, credences, subCredences, sensWeights, evaluator, pins, makeJoint)
      : [];
    return [...factorRows, ...subRows].sort((a, b) => b.swing - a.swing);
  }, [credences, subCredences, sensWeights, evaluator, pins, jointProbability, makeJoint]);

  // ── interventional contrast: "under what conditions is factor = state favorable?" ─
  const [decision, setDecision] = useState<Decision>(DEFAULT_DECISION);
  const decisionFactor = dataset.factors.find((f) => f.id === decision.factor)!;
  const towardLabel = decisionFactor.states.find((s) => s.id === decision.toward)?.label ?? decision.toward;
  const baselineLabel = decisionFactor.states.find((s) => s.id === decision.baseline)?.label ?? decision.baseline;
  const isObjective = decisionFactor.kind === 'objective';

  const pickFactor = (fid: string) => {
    const f = dataset.factors.find((x) => x.id === fid)!;
    setDecision({ factor: fid, toward: f.states[0].id, baseline: (f.states[1] ?? f.states[0]).id });
  };
  const setToward = (sid: string) =>
    setDecision((d) => ({ ...d, toward: sid, baseline: d.baseline === sid ? decisionFactor.states.find((s) => s.id !== sid)!.id : d.baseline }));
  const setBaseline = (sid: string) =>
    setDecision((d) => ({ ...d, baseline: sid, toward: d.toward === sid ? decisionFactor.states.find((s) => s.id !== sid)!.id : d.toward }));

  const contrast = useMemo(
    () => conditionalContrast(dataset, credences, weights, evaluator, decision, pins, jointProbability),
    [credences, weights, evaluator, decision, pins, jointProbability],
  );

  const [hmF1, hmF2] = useMemo(() => {
    const ids = contrast.cruxes.map((x) => x.factorId);
    return [ids[0], ids[1]] as [string | undefined, string | undefined];
  }, [contrast]);
  const grid = useMemo(
    () => (hmF1 && hmF2 ? contrastGrid(dataset, credences, weights, evaluator, decision, hmF1, hmF2, pins, jointProbability) : null),
    [credences, weights, evaluator, decision, pins, hmF1, hmF2, jointProbability],
  );
  const labelOf = (fid: string) => dataset.factors.find((f) => f.id === fid)?.label ?? fid;

  const [sweep, setSweep] = useState<{ factor: FactorId; state: StateId } | null>(null);
  const sweepFactorId =
    sweep && sweep.factor !== decision.factor && dataset.factors.some((f) => f.id === sweep.factor)
      ? sweep.factor
      : contrast.cruxes.find((x) => x.factorId !== decision.factor)?.factorId ?? dataset.factors.find((f) => f.id !== decision.factor)!.id;
  const sweepFactor = dataset.factors.find((f) => f.id === sweepFactorId)!;
  const sweepStateId =
    sweep && sweep.factor === sweepFactorId && sweepFactor.states.some((s) => s.id === sweep.state)
      ? sweep.state
      : sweepFactor.states[0].id;
  const sweepStateLabel = sweepFactor.states.find((s) => s.id === sweepStateId)?.label ?? sweepStateId;
  // The 51-point sweep is the tab's most expensive block: compute it after first
  // paint (mounted) and at deferred priority, so tab switches and slider drags
  // stay responsive while the sweep fills in.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const deferredCredences = useDeferredValue(credences);
  const threshold = useMemo(
    () =>
      mounted
        ? beliefThreshold(dataset, deferredCredences, weights, evaluator, decision, sweepFactorId, sweepStateId, pins, makeJoint)
        : null,
    [mounted, deferredCredences, weights, evaluator, decision, sweepFactorId, sweepStateId, pins, makeJoint],
  );

  const stateSelectSx = { fontFamily: fonts.display, fontSize: '0.84rem' };


  return (
    <>
      <Panel>
        <Tornado
          rows={sens}
          measureLabel={sensMeasureLabel}
          control={
            <FormControl size="small" variant="standard">
              <Select
                value={sensDim}
                onChange={(e) => setSensDim(e.target.value as 'weighted' | ValueDimensionId)}
                disableUnderline
                sx={{ fontFamily: fonts.mono, fontSize: '0.72rem', color: c.mute, '& .MuiSelect-icon': { color: c.faint } }}
                MenuProps={{ slotProps: { paper: { sx: { bgcolor: c.panel, border: `1px solid ${c.line}` } } } }}
              >
                <MenuItem value="weighted" sx={{ fontSize: '0.75rem' }}>measure: weighted EV</MenuItem>
                {dataset.valueDimensions.map((d) => (
                  <MenuItem key={d.id} value={d.id} sx={{ fontSize: '0.75rem' }}>measure: {d.label.toLowerCase()}</MenuItem>
                ))}
              </Select>
            </FormControl>
          }
        />
      </Panel>

      <Panel>
        <Typography variant="overline" sx={{ color: c.mute }}>Under what conditions is a factor favorable?</Typography>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap",
            mt: 0.5,
            mb: 1.5
          }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select value={decision.factor} onChange={(e) => pickFactor(e.target.value)} sx={stateSelectSx}>
              {dataset.factors.map((f) => (
                <MenuItem key={f.id} value={f.id} sx={stateSelectSx}>{f.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography sx={{ color: c.mute, fontFamily: fonts.body }}>→</Typography>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={decision.toward} onChange={(e) => setToward(e.target.value)} sx={{ ...stateSelectSx, color: c.teal }}>
              {decisionFactor.states.map((s) => (
                <MenuItem key={s.id} value={s.id} sx={stateSelectSx}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography sx={{ color: c.faint, fontFamily: fonts.body }}>vs</Typography>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={decision.baseline} onChange={(e) => setBaseline(e.target.value)} sx={stateSelectSx}>
              {decisionFactor.states.map((s) => (
                <MenuItem key={s.id} value={s.id} sx={stateSelectSx}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Box sx={{ borderTop: `1px solid ${c.line}`, pt: 1.5 }}>
          <Typography variant="body2" sx={{ color: c.mute, mb: 0.5, display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap' }}>
            At your current beliefs,{' '}
            {isObjective ? 'if it turns out ' : 'steering '}
            <Box component="span" sx={{ color: c.teal, mx: 0.5 }}>{decisionFactor.label} {isObjective ? '=' : '→'} {towardLabel}</Box>
            {' '}(vs {baselineLabel}) {isObjective ? 'would be' : 'is'}
            <InfoTip>
              {isObjective
                ? 'This factor is objective; you can’t steer it, so read this as value of information: how much the verdict moves if it turns out one way vs. the other. '
                : ''}
              Each future is compared to itself with only this factor changed (all else held fixed),
              so net EV and the favorable share always agree in sign.
              {Object.keys(pins).length > 0 ? ` Holding fixed the ${Object.keys(pins).length} condition(s) you pinned in Beliefs.` : ''}
            </InfoTip>
          </Typography>
          <Stack
            direction="row"
            spacing={3}
            useFlexGap
            sx={{
              alignItems: "baseline",
              flexWrap: "wrap"
            }}>
            <Typography sx={{ fontFamily: fonts.display, fontSize: '1.5rem', color: valueColor(Math.max(-1, Math.min(1, contrast.netDelta * 3))) }}>
              {contrast.netDelta >= 0 ? '+' : ''}{contrast.netDelta.toFixed(3)}
              <Box component="span" sx={{ fontSize: '0.8rem', color: c.mute, ml: 0.75 }}>net EV</Box>
            </Typography>
            <Typography sx={{ fontFamily: fonts.mono, fontSize: '1.05rem', color: c.bone }}>
              {(contrast.favorableShare * 100).toFixed(0)}%
              <Box component="span" sx={{ fontSize: '0.78rem', color: c.mute, ml: 0.75 }}>
                of probability-weighted futures {isObjective ? 'come out better that way' : 'favor it'}
              </Box>
            </Typography>
          </Stack>
        </Box>
      </Panel>

      <Panel>
        <ConditionTornado
          rows={contrast.cruxes}
          decisionLabel={
            isObjective
              ? `${decisionFactor.label.toLowerCase()} turning out ${towardLabel.toLowerCase()}`
              : `${decisionFactor.label.toLowerCase()} → ${towardLabel.toLowerCase()}`
          }
        />
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 2 }}>
          <ConditionList title="FAVORABLE WHEN" color={c.teal} lines={contrast.favorableWhen} sign="+" />
          <ConditionList title="UNFAVORABLE WHEN" color={c.red} lines={contrast.unfavorableWhen} sign="" />
        </Box>
      </Panel>

      {DEV_TOOLS && grid ? (
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
              Sweeps your credence in one factor-state from 0 to 100% and traces the choice's net EV,
              marking the break-even credence where the verdict flips. This varies a marginal belief, so
              it uses the independence model regardless of the active probability model.
            </>
          }
        />
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            flexWrap: "wrap",
            mt: 0.5,
            mb: 1.5
          }}>
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
              {dataset.factors
                .filter((f) => f.id !== decision.factor)
                .map((f) => (
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
