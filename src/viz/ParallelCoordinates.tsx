import { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import type { Factor } from '@model/types';
import type { EvaluatedScenario } from '@engine/analyze';
import { c, fonts, valueColor, valueGradient } from '@shell/theme';

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

const keyOf = (factorId: string, stateId: string) => `${factorId}:${stateId}`;

/**
 * Parallel-coordinates plot of the N-dimensional scenario space. One vertical axis
 * per factor (plus a continuous Value axis); each scenario is a polyline colored by
 * its value and made more opaque by its probability — so the likely, high-stakes
 * futures visually dominate.
 *
 * Two things make the hairball legible:
 *  - each axis-state node is colored by the probability-weighted mean value of the
 *    futures passing through it, so the factor→outcome relationship reads at a glance
 *    (e.g. "orthogonality holds" sits red, "fails" sits teal);
 *  - hovering a node traces the futures that share that state and dims the rest, with
 *    a readout of how much probability mass they carry — so interactions (a factor
 *    whose effect flips depending on another) become visible.
 */
export function ParallelCoordinates({ scenarios, factors }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const active = hovered ?? locked;

  const width = 760;
  const height = 380;
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

  // Per-state conditional stats: probability mass through the state and the
  // probability-weighted mean value of futures passing through it. Drives the node
  // colors (the factor→outcome relationship) and the hover readout.
  const stateStats = useMemo(() => {
    const m = new Map<string, { p: number; ev: number; count: number }>();
    for (const f of factors) for (const st of f.states) m.set(keyOf(f.id, st.id), { p: 0, ev: 0, count: 0 });
    for (const s of scenarios) {
      for (const f of factors) {
        const e = m.get(keyOf(f.id, s.scenario[f.id]));
        if (e) {
          e.p += s.probability;
          e.ev += s.probability * s.scalar;
          e.count += 1;
        }
      }
    }
    return m;
  }, [scenarios, factors]);
  const maxStateP = Math.max(0.0001, ...[...stateStats.values()].map((e) => e.p));

  const ordered = [...scenarios].sort((a, b) => a.probability - b.probability);
  const isActive = (s: EvaluatedScenario) => {
    if (!active) return true;
    const [fid, sid] = active.split(':');
    return s.scenario[fid] === sid;
  };

  const pointsFor = (s: EvaluatedScenario) =>
    axes
      .map((axis, i) => {
        const x = axisX(i);
        const y = axis.type === 'factor' ? factorY(axis.factor, s.scenario[axis.factor.id]) : valueY(s.scalar);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  // Draw dimmed (inactive) lines first, then highlighted ones on top.
  const dim = active ? ordered.filter((s) => !isActive(s)) : [];
  const lit = active ? ordered.filter(isActive) : ordered;

  // Readout for the active selection.
  const readout = useMemo(() => {
    if (!active) return null;
    const [fid, sid] = active.split(':');
    const factor = factors.find((f) => f.id === fid);
    const state = factor?.states.find((s) => s.id === sid);
    const e = stateStats.get(active);
    if (!factor || !state || !e) return null;
    return {
      label: factor.label,
      state: state.label,
      pct: e.p * 100,
      count: e.count,
      mean: e.p > 0 ? e.ev / e.p : 0,
    };
  }, [active, factors, stateStats]);

  // text with an ink halo so it stays legible on top of the polylines
  const halo = { stroke: c.ink, strokeWidth: 3, paintOrder: 'stroke' as const, strokeLinejoin: 'round' as const };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Possibility space
      </Typography>
      <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 0.5 }}>
        Every possible future at once. Each line threads left-to-right through the state it takes on
        each factor, landing on its overall <b>Value</b> (far-right axis). Faint lines are improbable
        futures; each axis dot is colored by the average value of the futures through it.
      </Typography>

      {/* readout / hint + value legend */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.75, minHeight: 22 }}>
        <Typography variant="caption" sx={{ color: readout ? c.bone : c.faint, fontFamily: fonts.body }}>
          {readout ? (
            <>
              <Box component="span" sx={{ fontFamily: fonts.display }}>{readout.label} = {readout.state}</Box>
              {' · '}
              <Box component="span" sx={{ fontFamily: fonts.mono }}>{readout.pct.toFixed(1)}%</Box> of futures
              {' · mean value '}
              <Box component="span" sx={{ fontFamily: fonts.mono, color: valueColor(readout.mean) }}>{readout.mean >= 0 ? '+' : ''}{readout.mean.toFixed(2)}</Box>
              {locked ? ' · click again to release' : ''}
            </>
          ) : (
            'Hover a factor state to trace the futures that share it. Click to keep it lit.'
          )}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography variant="caption" sx={{ color: c.red, fontFamily: fonts.mono }}>catastrophe</Typography>
          <Box sx={{ width: 70, height: 7, borderRadius: 4, background: valueGradient }} />
          <Typography variant="caption" sx={{ color: c.teal, fontFamily: fonts.mono }}>flourishing</Typography>
        </Box>
      </Box>

      <Box sx={{ overflowX: 'auto' }}>
        <svg
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Parallel coordinates of the scenario space"
          style={{ minWidth: 620 }}
          onMouseLeave={() => setHovered(null)}
        >
          {/* axes */}
          {axes.map((_, i) => (
            <line key={i} x1={axisX(i)} x2={axisX(i)} y1={padding.top} y2={padding.top + plotH} stroke={c.line} />
          ))}

          {/* dimmed lines (when a state is active) */}
          {dim.map((s, idx) => (
            <polyline key={`d${idx}`} points={pointsFor(s)} fill="none" stroke={c.faint} strokeWidth={0.8} opacity={0.05} />
          ))}

          {/* highlighted / all lines */}
          {lit.map((s, idx) => (
            <polyline
              key={`l${idx}`}
              points={pointsFor(s)}
              fill="none"
              stroke={valueColor(s.scalar)}
              strokeWidth={active ? 1.5 : 1.2}
              opacity={(active ? 0.25 : 0.07) + 0.7 * (s.probability / maxP)}
            />
          ))}

          {/* interactive state nodes: colored by conditional mean value, sized by mass */}
          {axes.map((axis, i) =>
            axis.type === 'factor'
              ? axis.factor.states.map((st) => {
                  const k = keyOf(axis.factor.id, st.id);
                  const e = stateStats.get(k)!;
                  const cy = factorY(axis.factor, st.id);
                  const r = 2.5 + 4 * Math.sqrt(e.p / maxStateP);
                  const on = active === k;
                  const bandH = plotH / axis.factor.states.length;
                  return (
                    <g
                      key={k}
                      onMouseEnter={() => setHovered(k)}
                      onClick={() => setLocked((p) => (p === k ? null : k))}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* invisible hit target spanning this state's band */}
                      <rect x={axisX(i) - 26} y={cy - bandH / 2} width={52} height={bandH} fill="transparent" />
                      <circle
                        cx={axisX(i)}
                        cy={cy}
                        r={on ? r + 2 : r}
                        fill={e.p > 0 ? valueColor(e.ev / e.p) : c.faint}
                        stroke={on ? c.bone : c.ink}
                        strokeWidth={on ? 1.5 : 0.75}
                      />
                    </g>
                  );
                })
              : null,
          )}

          {/* tick labels (haloed) */}
          {axes.map((axis, i) =>
            axis.type === 'factor'
              ? axis.factor.states.map((st) => (
                  <text
                    key={`${i}-${st.id}`}
                    x={axisX(i)}
                    y={factorY(axis.factor, st.id) - 7}
                    fill={c.bone}
                    fontSize={9}
                    fontFamily={fonts.display}
                    textAnchor="middle"
                    pointerEvents="none"
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
                pointerEvents="none"
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
