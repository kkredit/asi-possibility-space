import { Box, Typography } from '@mui/material';
import type { BeliefThreshold as BeliefThresholdData } from '@engine/conditions';
import { c, fonts, valueColor } from '@shell/theme';

interface Props {
  data: BeliefThresholdData;
  factorLabel: string;
  stateLabel: string;
}

/**
 * "How sure would you need to be?" — the contrast's net EV as your credence in one
 * factor-state sweeps 0 → 1, with the break-even credence(s) where the verdict flips.
 */
export function BeliefThreshold({ data, factorLabel, stateLabel }: Props) {
  const width = 520;
  const height = 168;
  const pad = { top: 14, right: 16, bottom: 30, left: 16 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const m = Math.max(0.02, ...data.points.map((p) => Math.abs(p.netDelta)));
  const xOf = (p: number) => pad.left + p * plotW;
  const yOf = (d: number) => pad.top + ((m - d) / (2 * m)) * plotH;
  const zeroY = yOf(0);

  const line = data.points.map((p) => `${xOf(p.p).toFixed(1)},${yOf(p.netDelta).toFixed(1)}`).join(' ');

  // Readout sentence from the crossings.
  const pct = (p: number) => `${Math.round(p * 100)}%`;
  let verdict: string;
  if (data.crossings.length === 1) {
    const x = data.crossings[0];
    verdict = `Favorable while your credence in “${stateLabel}” is ${x.favorableAbove ? 'above' : 'below'} ${pct(x.p)}.`;
  } else if (data.crossings.length === 0) {
    verdict = data.netDeltaAtCurrent >= 0
      ? `Favorable at every credence in “${stateLabel}”.`
      : `Unfavorable at every credence in “${stateLabel}”.`;
  } else {
    verdict = `The verdict flips at ${data.crossings.map((x) => pct(x.p)).join(' and ')}.`;
  }

  return (
    <Box>
      <Typography variant="body2" sx={{ color: c.bone, mb: 0.5 }}>{verdict}</Typography>
      <Typography variant="caption" sx={{ color: c.faint, display: 'block', mb: 1 }}>
        net EV of the choice as your credence in {factorLabel} = {stateLabel} sweeps 0 → 100% (independence model)
      </Typography>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Belief-threshold sweep" style={{ maxWidth: width }}>
        {/* favorable / unfavorable bands */}
        <rect x={pad.left} y={pad.top} width={plotW} height={zeroY - pad.top} fill={c.teal} opacity={0.06} />
        <rect x={pad.left} y={zeroY} width={plotW} height={pad.top + plotH - zeroY} fill={c.red} opacity={0.06} />
        <line x1={pad.left} x2={width - pad.right} y1={zeroY} y2={zeroY} stroke={c.faint} strokeDasharray="2 4" />

        {/* current credence marker */}
        <line x1={xOf(data.currentP)} x2={xOf(data.currentP)} y1={pad.top} y2={pad.top + plotH} stroke={c.bone} strokeWidth={1} opacity={0.5} />
        <text x={xOf(data.currentP)} y={pad.top - 3} fill={c.mute} fontSize={9} fontFamily={fonts.mono} textAnchor="middle">
          now {Math.round(data.currentP * 100)}%
        </text>

        {/* the sweep line */}
        <polyline points={line} fill="none" stroke={valueColor(Math.max(-1, Math.min(1, data.netDeltaAtCurrent * 3)))} strokeWidth={1.6} />

        {/* break-even markers */}
        {data.crossings.map((x, i) => (
          <g key={i}>
            <circle cx={xOf(x.p)} cy={zeroY} r={3.5} fill={c.bone} />
            <text x={xOf(x.p)} y={pad.top + plotH + 12} fill={c.bone} fontSize={9} fontFamily={fonts.mono} textAnchor="middle">
              {Math.round(x.p * 100)}%
            </text>
          </g>
        ))}

        {/* axis ticks */}
        {[0, 0.5, 1].map((p) => (
          <text key={p} x={xOf(p)} y={height - 6} fill={c.faint} fontSize={9} fontFamily={fonts.mono} textAnchor={p === 0 ? 'start' : p === 1 ? 'end' : 'middle'}>
            {Math.round(p * 100)}%
          </text>
        ))}
      </svg>
    </Box>
  );
}
