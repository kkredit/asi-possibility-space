import { Box, Stack, Typography } from '@mui/material';
import type { SensitivityRow } from '@engine/sensitivity';
import { kindColor, kindLabel } from '@shell/theme';

interface Props {
  rows: SensitivityRow[];
}

/** Tornado chart: EV swing per factor, colored by kind (the "where to act" read-out). */
export function Tornado({ rows }: Props) {
  const width = 520;
  const rowH = 30;
  const labelW = 150;
  const height = rows.length * rowH + 24;
  const plotL = labelW;
  const plotW = width - labelW - 16;
  const xOf = (v: number) => plotL + ((v + 1) / 2) * plotW;
  const kinds = [...new Set(rows.map((r) => r.kind))];

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Sensitivity — how much EV swings per factor
      </Typography>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sensitivity tornado">
        <line x1={xOf(0)} x2={xOf(0)} y1={4} y2={rows.length * rowH + 4} stroke="#8b949e" strokeDasharray="3 3" />
        {rows.map((r, i) => {
          const y = i * rowH + 8;
          const x1 = xOf(Math.min(r.evLow, r.evHigh));
          const x2 = xOf(Math.max(r.evLow, r.evHigh));
          return (
            <g key={r.factorId}>
              <text x={0} y={y + rowH / 2 - 2} fill="#c9d1d9" fontSize={11}>
                {r.label.length > 22 ? r.label.slice(0, 21) + '…' : r.label}
              </text>
              <rect x={x1} y={y} width={Math.max(2, x2 - x1)} height={rowH - 12} rx={3} fill={kindColor[r.kind]} opacity={0.9}>
                <title>{`${r.label}: EV ${r.evLow.toFixed(2)} … ${r.evHigh.toFixed(2)} (swing ${r.swing.toFixed(2)})`}</title>
              </rect>
              <text x={x2 + 4} y={y + rowH / 2 - 2} fill="#8b949e" fontSize={10}>
                {r.swing.toFixed(2)}
              </text>
            </g>
          );
        })}
        {[-1, 0, 1].map((v) => (
          <text key={v} x={xOf(v)} y={height - 2} fill="#8b949e" fontSize={10} textAnchor="middle">
            {v}
          </text>
        ))}
      </svg>
      <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1 }}>
        {kinds.map((k) => (
          <Stack key={k} direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 12, height: 12, bgcolor: kindColor[k], borderRadius: 0.5 }} />
            <Typography variant="caption" color="text.secondary">
              {kindLabel[k]}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
