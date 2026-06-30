import { useMemo, useState } from 'react';
import { Box, FormControl, MenuItem, Select, Stack, Typography } from '@mui/material';
import { dataset } from '@model/dataset';
import type { Credences, Evaluator, Scenario, ValueVector } from '@model/types';
import { conditionalContrast, contrastGrid, type Decision } from '@engine/index';
import type { Pins } from '@engine/scenarios';
import { Panel } from '@shell/Panel';
import { c, fonts, valueColor } from '@shell/theme';
import { ConditionTornado } from '@viz/ConditionTornado';
import { ConditionHeatmap } from '@viz/ConditionHeatmap';
import { InfoTip } from '@viz/InfoTip';

interface Props {
  credences: Credences;
  weights: ValueVector;
  evaluator: Evaluator;
  pins: Pins;
  jointProbability?: (s: Scenario) => number;
}

/**
 * "Under what conditions is choice X favorable?" — pick any factor as a hypothetical
 * lever (toward vs baseline) and see the net verdict, the share of futures that favor
 * it, the crux tornado of which other factor flips it, and a two-way map.
 */
export function ConditionsTab({ credences, weights, evaluator, pins, jointProbability }: Props) {
  // Default to the open-source example: power concentration → diffuse vs concentrated.
  const [decision, setDecision] = useState<Decision>({
    factor: 'powerConcentration',
    toward: 'diffuse',
    baseline: 'concentrated',
  });
  const decisionFactor = dataset.factors.find((f) => f.id === decision.factor)!;
  const towardLabel = decisionFactor.states.find((s) => s.id === decision.toward)?.label ?? decision.toward;
  const baselineLabel = decisionFactor.states.find((s) => s.id === decision.baseline)?.label ?? decision.baseline;
  // Objective factors can't be steered — the same contrast reads as value of
  // information ("if it turns out A vs B…"), not an intervention ("steer toward A").
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

  // Two-way map: default to the top two cruxes (most verdict-moving factors).
  const [hmF1, hmF2] = useMemo(() => {
    const ids = contrast.cruxes.map((x) => x.factorId);
    return [ids[0], ids[1]] as [string | undefined, string | undefined];
  }, [contrast]);
  const grid = useMemo(
    () => (hmF1 && hmF2 ? contrastGrid(dataset, credences, weights, evaluator, decision, hmF1, hmF2, pins, jointProbability) : null),
    [credences, weights, evaluator, decision, pins, hmF1, hmF2, jointProbability],
  );
  const labelOf = (fid: string) => dataset.factors.find((f) => f.id === fid)?.label ?? fid;

  const stateSelectSx = { fontFamily: fonts.display, fontSize: '0.84rem' };

  return (
    <>
      <Panel>
        <Typography variant="overline" sx={{ color: c.mute }}>The choice</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5, mb: 1.5 }}>
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

        {/* Verdict headline */}
        <Box sx={{ borderTop: `1px solid ${c.line}`, pt: 1.5 }}>
          <Typography variant="body2" sx={{ color: c.mute, mb: 0.5, display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap' }}>
            At your current beliefs,{' '}
            {isObjective ? 'if it turns out ' : 'steering '}
            <Box component="span" sx={{ color: c.teal, mx: 0.5 }}>{decisionFactor.label} {isObjective ? '=' : '→'} {towardLabel}</Box>
            {' '}(vs {baselineLabel}) {isObjective ? 'would be' : 'is'}
            <InfoTip>
              {isObjective
                ? 'This factor is objective — you can’t steer it, so read this as value of information: how much the verdict moves if it turns out one way vs. the other. '
                : ''}
              Each future is compared to itself with only this factor changed (all else held fixed),
              so net EV and the favorable share always agree in sign.
              {Object.keys(pins).length > 0 ? ` Holding fixed the ${Object.keys(pins).length} condition(s) you pinned in Beliefs.` : ''}
            </InfoTip>
          </Typography>
          <Stack direction="row" spacing={3} alignItems="baseline" flexWrap="wrap" useFlexGap>
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

      {grid ? (
        <Panel>
          <ConditionHeatmap
            data={{
              f1Label: labelOf(grid.f1),
              f2Label: labelOf(grid.f2),
              rows: grid.rows,
              cols: grid.cols,
              cells: grid.cells,
              maxAbs: grid.maxAbs,
            }}
          />
        </Panel>
      ) : null}
    </>
  );
}

function ConditionList({
  title,
  color,
  sign,
  lines,
}: {
  title: string;
  color: string;
  sign: string;
  lines: { factorId: string; stateId: string; label: string; stateLabel: string; delta: number }[];
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 220 }}>
      <Typography variant="caption" sx={{ color, fontFamily: fonts.display, fontWeight: 600 }}>{title}</Typography>
      {lines.length === 0 ? (
        <Typography variant="body2" sx={{ color: c.faint }}>— never, at these beliefs</Typography>
      ) : (
        lines.map((l) => (
          <Typography key={l.factorId + l.stateId} variant="body2" sx={{ color: c.bone }}>
            {l.label} = {l.stateLabel}{' '}
            <Box component="span" sx={{ fontFamily: fonts.mono, color }}>{sign}{l.delta.toFixed(3)}</Box>
          </Typography>
        ))
      )}
    </Box>
  );
}
