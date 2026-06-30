import { Box, Stack, Typography } from '@mui/material';
import type { SensitivityRow } from '@engine/sensitivity';
import { c, fonts, kindColor, kindLabel } from '@shell/theme';
import { wrapLabel } from '@viz/text';

interface Props {
  rows: SensitivityRow[];
}

/** Tornado chart: EV swing per factor, colored by kind (the "where to act" read-out). */
export function Tornado({ rows }: Props) {
  const width = 880;
  const rowH = 40;
  const labelW = 250;
  const padR = 20;
  const chartTop = 6;
  const height = rows.length * rowH + 40;
  const plotW = width - labelW - padR;
  const xOf = (v: number) => labelW + ((v + 1) / 2) * plotW;
  const kinds = [...new Set(rows.map((r) => r.kind))];

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Where it matters
      </Typography>
      <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 1 }}>
        how far EV swings as each factor moves across its states — colored by what you can do about it
      </Typography>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sensitivity tornado">
        <line x1={xOf(0)} x2={xOf(0)} y1={chartTop} y2={rows.length * rowH + chartTop} stroke={c.faint} strokeDasharray="2 4" />
        {rows.map((r, i) => {
          const y = i * rowH + chartTop;
          const x1 = xOf(Math.min(r.evLow, r.evHigh));
          const x2 = xOf(Math.max(r.evLow, r.evHigh));
          const barW = Math.max(3, x2 - x1);
          const labelLines = wrapLabel(r.label, 24, 2);
          return (
            <g key={r.factorId}>
              <text x={0} y={y + rowH / 2} fill={c.bone} fontSize={13} fontFamily={fonts.display} dominantBaseline="middle">
                {labelLines.map((line, li) => (
                  <tspan key={li} x={0} dy={li === 0 ? (labelLines.length > 1 ? -7 : 0) : 14}>
                    {line}
                  </tspan>
                ))}
              </text>
              <rect x={x1} y={y + 8} width={barW} height={rowH - 18} rx={3} fill={kindColor[r.kind]} opacity={0.92}>
                <title>{`${r.label}: EV ${r.evLow.toFixed(2)} … ${r.evHigh.toFixed(2)} (swing ${r.swing.toFixed(2)})`}</title>
              </rect>
              <text x={x2 + 8} y={y + rowH / 2} fill={c.mute} fontSize={12} fontFamily={fonts.mono} dominantBaseline="middle">
                {r.swing.toFixed(2)}
              </text>
            </g>
          );
        })}
        {[-1, 0, 1].map((v) => (
          <text key={v} x={xOf(v)} y={height - 8} fill={c.mute} fontSize={11} fontFamily={fonts.mono} textAnchor="middle">
            {v > 0 ? '+1' : v}
          </text>
        ))}
      </svg>
      <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
        {kinds.map((k) => (
          <Stack key={k} direction="row" spacing={0.75} alignItems="center">
            <Box sx={{ width: 11, height: 11, bgcolor: kindColor[k], borderRadius: 0.5 }} />
            <Typography variant="caption" sx={{ color: c.mute }}>
              {kindLabel[k]}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
