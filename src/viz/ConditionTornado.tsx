import { Box, Stack, Typography } from '@mui/material';
import { c, fonts } from '@shell/theme';
import { InfoTip } from '@viz/InfoTip';

export interface CruxRow {
  factorId: string;
  label: string;
  low: number;
  high: number;
  lowStateLabel: string;
  highStateLabel: string;
  flips: boolean;
}

interface Props {
  rows: CruxRow[];
  /** Name of the choice being evaluated, for the caption (e.g. "open-source"). */
  decisionLabel: string;
}

function wrap(label: string, maxChars = 22, maxLines = 2): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of label.split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxChars) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else current = candidate;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

/**
 * Crux tornado: for each other factor, a bar spanning the contrast's EV delta across
 * that factor's states. Bars right of the zero line (green) are conditions that make
 * the choice favorable; left (red) unfavorable. A bar that crosses zero is a
 * verdict-flipper — that factor decides whether the choice is good.
 */
export function ConditionTornado({ rows, decisionLabel }: Props) {
  const width = 880;
  const rowH = 42;
  const labelW = 220;
  const padR = 188; // room for the ✓/✗ state annotations
  const chartTop = 6;
  const height = rows.length * rowH + 40;
  const plotW = width - labelW - padR;
  const m = Math.max(0.05, ...rows.map((r) => Math.max(Math.abs(r.low), Math.abs(r.high)))) * 1.05;
  const xOf = (v: number) => labelW + ((v + m) / (2 * m)) * plotW;

  return (
    <Box>
      <Stack direction="row" alignItems="center" sx={{ mb: 0.25 }}>
        <Typography variant="subtitle2">Under what conditions</Typography>
        <InfoTip>
          EV gain from {decisionLabel} as each other factor varies. Right of the line (green) the choice
          helps; left (red) it hurts; a bar crossing the line is what flips the verdict.
        </InfoTip>
      </Stack>
      <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 1 }}>
        EV gain from {decisionLabel} · green helps, red hurts
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Conditional contrast tornado" style={{ minWidth: 680 }}>
          <line x1={xOf(0)} x2={xOf(0)} y1={chartTop} y2={rows.length * rowH + chartTop} stroke={c.faint} />
          {rows.map((r, i) => {
            const y = i * rowH + chartTop;
            const cy = y + rowH / 2;
            const barY = y + 9;
            const barH = rowH - 20;
            const x0 = xOf(0);
            const labelLines = wrap(r.label);
            return (
              <g key={r.factorId}>
                <text x={0} y={cy} fill={c.bone} fontSize={12.5} fontFamily={fonts.display} dominantBaseline="middle">
                  {labelLines.map((line, li) => (
                    <tspan key={li} x={0} dy={li === 0 ? (labelLines.length > 1 ? -7 : 0) : 14}>
                      {line}
                    </tspan>
                  ))}
                </text>
                {/* unfavorable (red) portion, left of zero */}
                {r.low < 0 ? (
                  <rect x={xOf(r.low)} y={barY} width={Math.max(2, x0 - xOf(r.low))} height={barH} rx={2} fill={c.red} opacity={0.9}>
                    <title>{`${r.lowStateLabel}: ${r.low.toFixed(2)} EV`}</title>
                  </rect>
                ) : null}
                {/* favorable (green) portion, right of zero */}
                {r.high > 0 ? (
                  <rect x={x0} y={barY} width={Math.max(2, xOf(r.high) - x0)} height={barH} rx={2} fill={c.teal} opacity={0.9}>
                    <title>{`${r.highStateLabel}: +${r.high.toFixed(2)} EV`}</title>
                  </rect>
                ) : null}
                {/* state annotations: best (favorable) and worst (unfavorable) */}
                <text x={width - padR + 12} y={cy} fontSize={11.5} fontFamily={fonts.body} dominantBaseline="middle">
                  {r.high > 0 ? (
                    <tspan fill={c.teal}>✓ {r.highStateLabel} </tspan>
                  ) : null}
                  {r.low < 0 ? (
                    <tspan fill={c.red}>✗ {r.lowStateLabel}</tspan>
                  ) : null}
                </text>
              </g>
            );
          })}
          {[-m, 0, m].map((v, i) => (
            <text key={i} x={xOf(v)} y={height - 8} fill={c.mute} fontSize={11} fontFamily={fonts.mono} textAnchor="middle">
              {v > 0 ? `+${v.toFixed(2)}` : v === 0 ? '0' : v.toFixed(2)}
            </text>
          ))}
        </svg>
      </Box>
    </Box>
  );
}
