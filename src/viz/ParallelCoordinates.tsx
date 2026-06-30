import { Box, Typography } from '@mui/material';
import type { Factor } from '@model/types';
import type { EvaluatedScenario } from '@engine/analyze';
import { c, fonts, valueColor } from '@shell/theme';

interface Props {
  scenarios: EvaluatedScenario[];
  factors: Factor[];
}

/** Greedily wrap a title into lines of at most maxChars, capped at maxLines (ellipsis if over). */
function wrapTitle(title: string, maxChars = 15, maxLines = 3): string[] {
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
 * Parallel-coordinates plot of the N-dimensional scenario space. One vertical axis
 * per factor (plus a continuous Value axis); each scenario is a polyline colored by
 * its value and made more opaque by its probability — so the likely, high-stakes
 * futures visually dominate. Tick labels get an ink halo so they read over the lines.
 */
export function ParallelCoordinates({ scenarios, factors }: Props) {
  const width = 760;
  const height = 360;
  const padding = { top: 30, right: 66, bottom: 92, left: 58 };
  const plotH = height - padding.top - padding.bottom;
  const axes = [...factors.map((f) => ({ type: 'factor' as const, factor: f })), { type: 'value' as const }];
  const n = axes.length;
  const axisX = (i: number) => padding.left + (i / (n - 1)) * (width - padding.left - padding.right);

  const factorY = (factor: Factor, stateId: string) => {
    const idx = factor.states.findIndex((s) => s.id === stateId);
    const k = factor.states.length;
    return padding.top + (k === 1 ? plotH / 2 : (idx / (k - 1)) * plotH);
  };
  const valueY = (scalar: number) => padding.top + ((1 - scalar) / 2) * plotH;

  const maxP = Math.max(0.0001, ...scenarios.map((s) => s.probability));
  const ordered = [...scenarios].sort((a, b) => a.probability - b.probability);

  const pointsFor = (s: EvaluatedScenario) =>
    axes
      .map((axis, i) => {
        const x = axisX(i);
        const y = axis.type === 'factor' ? factorY(axis.factor, s.scenario[axis.factor.id]) : valueY(s.scalar);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  // text with an ink halo so it stays legible on top of the polylines
  const halo = { stroke: c.ink, strokeWidth: 3, paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Possibility space
      </Typography>
      <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 1 }}>
        parallel coordinates — each line is one future · opacity ∝ probability · color ∝ value
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <svg
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Parallel coordinates of the scenario space"
          style={{ minWidth: 620 }}
        >
          {/* axes */}
          {axes.map((_, i) => (
            <line key={i} x1={axisX(i)} x2={axisX(i)} y1={padding.top} y2={padding.top + plotH} stroke={c.line} />
          ))}

          {/* polylines */}
          {ordered.map((s, idx) => (
            <polyline
              key={idx}
              points={pointsFor(s)}
              fill="none"
              stroke={valueColor(s.scalar)}
              strokeWidth={1.2}
              opacity={0.07 + 0.7 * (s.probability / maxP)}
            />
          ))}

          {/* tick labels (haloed) */}
          {axes.map((axis, i) =>
            axis.type === 'factor'
              ? axis.factor.states.map((st) => (
                  <text
                    key={`${i}-${st.id}`}
                    x={axisX(i)}
                    y={factorY(axis.factor, st.id) + 3}
                    fill={c.bone}
                    fontSize={9}
                    fontFamily={fonts.display}
                    textAnchor="middle"
                    {...halo}
                  >
                    {st.label.length > 11 ? st.label.slice(0, 10) + '…' : st.label}
                  </text>
                ))
              : [1, 0, -1].map((v) => (
                  <text
                    key={`v${v}`}
                    x={axisX(i) + 7}
                    y={valueY(v) + 3}
                    fill={c.mute}
                    fontSize={9}
                    fontFamily={fonts.mono}
                    textAnchor="start"
                    {...halo}
                  >
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
                y={padding.top + plotH + 18}
                fill={c.mute}
                fontSize={9}
                fontFamily={fonts.display}
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
