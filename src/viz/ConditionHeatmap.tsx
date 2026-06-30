import { Box, Typography } from '@mui/material';
import { c, fonts } from '@shell/theme';

export interface HeatmapData {
  f1Label: string;
  f2Label: string;
  rows: { stateId: string; label: string }[];
  cols: { stateId: string; label: string }[];
  cells: number[][];
  maxAbs: number;
}

interface Props {
  data: HeatmapData;
}

/** Diverging color for a contrast delta, normalized by the grid's own range. */
function deltaColor(delta: number, maxAbs: number): string {
  const t = maxAbs > 0 ? Math.max(-1, Math.min(1, delta / maxAbs)) : 0;
  // red (unfavorable) → neutral panel → teal (favorable)
  const mix = (a: number[], b: number[], u: number) =>
    `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * u)).join(',')})`;
  const neutral = [26, 32, 41]; // c.panel2
  const red = [228, 86, 74];
  const teal = [52, 211, 181];
  return t < 0 ? mix(neutral, red, -t) : mix(neutral, teal, t);
}

/**
 * Two-way map of the choice's EV delta over the states of two conditioning factors.
 * Green cells = the choice is favorable in that corner of the world; red = harmful.
 * Shows where a globally-mixed decision is actually good vs. catastrophic.
 */
export function ConditionHeatmap({ data }: Props) {
  const { rows, cols, cells, maxAbs } = data;
  const cellW = 96;
  const cellH = 46;
  const labelL = 120;
  const labelT = 26;
  const width = labelL + cols.length * cellW + 12;
  const height = labelT + rows.length * cellH + 28;

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Two-way map
      </Typography>
      <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 1 }}>
        EV gain from the choice across {data.f1Label} (rows) × {data.f2Label} (columns) · green = favorable, red = harmful
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Two-way contrast heatmap" style={{ maxWidth: width }}>
          {/* column headers */}
          {cols.map((col, j) => (
            <text key={col.stateId} x={labelL + j * cellW + cellW / 2} y={labelT - 9} fill={c.mute} fontSize={11} fontFamily={fonts.display} textAnchor="middle">
              {col.label.length > 13 ? col.label.slice(0, 12) + '…' : col.label}
            </text>
          ))}
          {rows.map((row, i) => (
            <g key={row.stateId}>
              <text x={labelL - 8} y={labelT + i * cellH + cellH / 2} fill={c.mute} fontSize={11} fontFamily={fonts.display} textAnchor="end" dominantBaseline="middle">
                {row.label.length > 16 ? row.label.slice(0, 15) + '…' : row.label}
              </text>
              {cols.map((col, j) => {
                const d = cells[i][j];
                return (
                  <g key={col.stateId}>
                    <rect
                      x={labelL + j * cellW}
                      y={labelT + i * cellH}
                      width={cellW - 3}
                      height={cellH - 3}
                      rx={3}
                      fill={deltaColor(d, maxAbs)}
                    >
                      <title>{`${row.label} × ${col.label}: ${d >= 0 ? '+' : ''}${d.toFixed(2)} EV`}</title>
                    </rect>
                    <text
                      x={labelL + j * cellW + (cellW - 3) / 2}
                      y={labelT + i * cellH + (cellH - 3) / 2}
                      fill={c.bone}
                      fontSize={12}
                      fontFamily={fonts.mono}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {d >= 0 ? '+' : ''}{d.toFixed(2)}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </Box>
    </Box>
  );
}
