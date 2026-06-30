import { Box, Typography } from '@mui/material';
import type { Factor } from '@model/types';
import type { EvaluatedScenario } from '@engine/analyze';
import { valueColor } from '@shell/theme';

interface Props {
  scenarios: EvaluatedScenario[];
  factors: Factor[];
}

/** Greedily wrap a title into lines of at most maxChars, capped at maxLines (ellipsis if over). */
function wrapTitle(title: string, maxChars = 16, maxLines = 3): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of title.split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > maxChars) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  else if (current) lines[maxLines - 1] = `${lines[maxLines - 1].replace(/.$/, '')}…`;
  return lines;
}

/**
 * Parallel-coordinates plot of the N-dimensional scenario space. One vertical
 * axis per factor (plus a continuous Value axis); each scenario is a polyline
 * colored by its value and made more opaque by its probability — so the likely,
 * high-stakes futures visually dominate.
 */
export function ParallelCoordinates({ scenarios, factors }: Props) {
  const width = 720;
  const height = 360;
  const padding = { top: 28, right: 60, bottom: 96, left: 24 };
  const plotH = height - padding.top - padding.bottom;
  const axes = [...factors.map((f) => ({ type: 'factor' as const, factor: f })), { type: 'value' as const }];
  const n = axes.length;
  const axisX = (i: number) => padding.left + (i / (n - 1)) * (width - padding.left - padding.right);

  // y for a categorical state: states spread evenly down the axis.
  const factorY = (factor: Factor, stateId: string) => {
    const idx = factor.states.findIndex((s) => s.id === stateId);
    const k = factor.states.length;
    return padding.top + (k === 1 ? plotH / 2 : (idx / (k - 1)) * plotH);
  };
  // y for the continuous value axis: +1 at top, -1 at bottom.
  const valueY = (scalar: number) => padding.top + ((1 - scalar) / 2) * plotH;

  const maxP = Math.max(0.0001, ...scenarios.map((s) => s.probability));
  // Draw low-probability lines first so high-probability ones land on top.
  const ordered = [...scenarios].sort((a, b) => a.probability - b.probability);

  const pointsFor = (s: EvaluatedScenario) =>
    axes
      .map((axis, i) => {
        const x = axisX(i);
        const y = axis.type === 'factor' ? factorY(axis.factor, s.scenario[axis.factor.id]) : valueY(s.scalar);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Possibility space (parallel coordinates) — opacity ∝ probability, color ∝ value
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Parallel coordinates of the scenario space" style={{ minWidth: 560 }}>
          {/* axes */}
          {axes.map((_, i) => (
            <line key={i} x1={axisX(i)} x2={axisX(i)} y1={padding.top} y2={padding.top + plotH} stroke="#30363d" />
          ))}
          {/* polylines */}
          {ordered.map((s, idx) => (
            <polyline
              key={idx}
              points={pointsFor(s)}
              fill="none"
              stroke={valueColor(s.scalar)}
              strokeWidth={s.reasoned ? 1.6 : 1}
              opacity={0.08 + 0.72 * (s.probability / maxP)}
            />
          ))}
          {/* axis tick labels */}
          {axes.map((axis, i) =>
            axis.type === 'factor'
              ? axis.factor.states.map((st) => (
                  <text
                    key={`${i}-${st.id}`}
                    x={axisX(i)}
                    y={factorY(axis.factor, st.id) + 3}
                    fill="#8b949e"
                    fontSize={9}
                    textAnchor="middle"
                  >
                    {st.label.length > 10 ? st.label.slice(0, 9) + '…' : st.label}
                  </text>
                ))
              : [1, 0, -1].map((v) => (
                  <text key={`v${v}`} x={axisX(i) + 6} y={valueY(v) + 3} fill="#8b949e" fontSize={9} textAnchor="start">
                    {v > 0 ? '+1' : v}
                  </text>
                )),
          )}
          {/* axis titles */}
          {axes.map((axis, i) => {
            const title = axis.type === 'factor' ? axis.factor.label : 'Value';
            return (
              <text
                key={`t${i}`}
                x={axisX(i)}
                y={padding.top + plotH + 16}
                fill="#c9d1d9"
                fontSize={9}
                textAnchor="middle"
              >
                {wrapTitle(title).map((line, li) => (
                  <tspan key={li} x={axisX(i)} dy={li === 0 ? 0 : 10}>
                    {line}
                  </tspan>
                ))}
              </text>
            );
          })}
        </svg>
      </Box>
    </Box>
  );
}
