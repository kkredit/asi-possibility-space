import { useState } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import type { DistributionBin, EvaluatedScenario } from '@engine/analyze';
import type { Factor } from '@model/types';
import { c, fonts, valueColor } from '@shell/theme';

interface Props {
  bins: DistributionBin[];
  ev: number;
  factors: Factor[];
}

/** A scenario's description: its authored narrative, else its factor-state list. */
function describe(s: EvaluatedScenario, factors: Factor[]): string {
  if (s.narrative) return s.narrative;
  return factors
    .map((f) => f.states.find((st) => st.id === s.scenario[f.id])?.label ?? s.scenario[f.id])
    .join(' · ');
}

/** The full factor-by-factor makeup of a scenario, for the hover tooltip. */
function constitution(s: EvaluatedScenario, factors: Factor[]): string {
  const parts = factors.map(
    (f) => `${f.label}: ${f.states.find((st) => st.id === s.scenario[f.id])?.label ?? s.scenario[f.id]}`,
  );
  return `This scenario — ${parts.join(' · ')}`;
}

/** Histogram of probability mass over the scalar value axis [-1, 1]. */
export function EVDistribution({ bins, ev, factors }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const width = 560;
  const height = 224;
  const padding = { top: 26, right: 18, bottom: 46, left: 18 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const plotBottom = padding.top + plotH;
  const maxP = Math.max(0.0001, ...bins.map((b) => b.probability));
  const barW = plotW / bins.length;
  const xOf = (v: number) => padding.left + ((v + 1) / 2) * plotW;
  const evAnchor = ev > 0.78 ? 'end' : ev < -0.78 ? 'start' : 'middle';

  // Pinned takes precedence over hover; pinning lets you scroll the full list.
  const activeIndex = pinned != null ? pinned : hovered;
  const active = activeIndex != null ? bins[activeIndex] : null;
  const isPinned = pinned != null;
  const TOP = 4;
  const shown = active ? (isPinned ? active.scenarios : active.scenarios.slice(0, TOP)) : [];

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Outcome distribution
      </Typography>
      <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 1 }}>
        probability mass across the value spectrum · hover a bar to preview, click to pin & scroll all
      </Typography>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Outcome distribution"
        onMouseLeave={() => setHovered(null)}
      >
        <line x1={padding.left} x2={width - padding.right} y1={plotBottom} y2={plotBottom} stroke={c.line} />
        {bins.map((b, i) => {
          const h = (b.probability / maxP) * plotH;
          const mid = (b.lo + b.hi) / 2;
          const on = activeIndex === i;
          const pinnedBar = pinned === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onClick={() => setPinned((p) => (p === i ? null : i))}
              style={{ cursor: 'pointer' }}
            >
              {/* full-height hit target so thin bars are still easy to hover/click */}
              <rect x={padding.left + i * barW} y={padding.top} width={barW} height={plotH} fill="transparent" />
              <rect
                x={padding.left + i * barW + 1.5}
                y={plotBottom - h}
                width={barW - 3}
                height={h}
                rx={2}
                fill={valueColor(mid)}
                opacity={activeIndex == null || on ? 0.9 : 0.4}
                stroke={on ? c.bone : 'none'}
                strokeWidth={pinnedBar ? 1.5 : on ? 1 : 0}
              />
            </g>
          );
        })}

        {/* zero line */}
        <line x1={xOf(0)} x2={xOf(0)} y1={padding.top} y2={plotBottom} stroke={c.faint} strokeDasharray="2 4" />

        {/* EV marker */}
        <line x1={xOf(ev)} x2={xOf(ev)} y1={padding.top - 8} y2={plotBottom} stroke={c.bone} strokeWidth={1.5} />
        <text x={xOf(ev)} y={padding.top - 12} fill={c.bone} fontSize={11} fontFamily={fonts.mono} textAnchor={evAnchor}>
          EV {ev >= 0 ? '+' : '−'}{Math.abs(ev).toFixed(2)}
        </text>

        {/* numeric ticks */}
        {[-1, 0, 1].map((v) => (
          <text
            key={v}
            x={xOf(v)}
            y={plotBottom + 16}
            fill={c.mute}
            fontSize={11}
            fontFamily={fonts.mono}
            textAnchor={v === 0 ? 'middle' : v < 0 ? 'start' : 'end'}
          >
            {v > 0 ? '+1' : v}
          </text>
        ))}

        {/* spectrum end labels — on their own baseline so they never collide with the ticks */}
        <text x={padding.left} y={plotBottom + 33} fill={c.red} fontSize={10} fontFamily={fonts.display} textAnchor="start">
          extinction
        </text>
        <text x={width - padding.right} y={plotBottom + 33} fill={c.teal} fontSize={10} fontFamily={fonts.display} textAnchor="end">
          flourishing
        </text>
      </svg>

      {/* contributors panel — min-height so the layout never jumps */}
      <Box sx={{ mt: 0.5, minHeight: 96 }}>
        {active ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}>
              <Typography variant="caption">
                <Box component="span" sx={{ fontFamily: fonts.mono, color: valueColor((active.lo + active.hi) / 2) }}>
                  value {active.lo.toFixed(1)}…{active.hi.toFixed(1)}
                </Box>
                {' · '}
                <Box component="span" sx={{ fontFamily: fonts.mono, color: c.bone }}>
                  {(active.probability * 100).toFixed(1)}%
                </Box>{' '}
                <Box component="span" sx={{ color: c.mute }}>
                  of mass, across {active.scenarios.length} scenario{active.scenarios.length === 1 ? '' : 's'}
                </Box>
              </Typography>
              {isPinned ? (
                <Box
                  component="span"
                  onClick={() => setPinned(null)}
                  sx={{ cursor: 'pointer', color: c.mute, fontFamily: fonts.mono, fontSize: '0.72rem', whiteSpace: 'nowrap', '&:hover': { color: c.bone } }}
                >
                  ✕ unpin this outcome
                </Box>
              ) : null}
            </Box>
            <Box sx={isPinned ? { maxHeight: 200, overflowY: 'auto', pr: 0.5 } : undefined}>
              {shown.map((s, i) => (
                <Tooltip key={i} title={constitution(s, factors)} arrow placement="left">
                  <Box sx={{ display: 'flex', gap: 0.75, mb: 0.4, alignItems: 'baseline', cursor: 'help' }}>
                    <Box sx={{ flexShrink: 0, width: 7, height: 7, borderRadius: '50%', bgcolor: valueColor(s.scalar), mt: 0.4 }} />
                    <Typography variant="caption" sx={{ fontFamily: fonts.mono, color: c.bone, flexShrink: 0, width: 38, textAlign: 'right' }}>
                      {(s.probability * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" sx={{ color: c.mute, lineHeight: 1.35 }}>
                      {describe(s, factors)}
                    </Typography>
                  </Box>
                </Tooltip>
              ))}
            </Box>
            {!isPinned && active.scenarios.length > TOP ? (
              <Typography variant="caption" sx={{ color: c.faint, display: 'block', mt: 0.25 }}>
                +{active.scenarios.length - TOP} more — click the bar to pin and scroll all{' '}
                {active.scenarios.length}
              </Typography>
            ) : null}
          </>
        ) : (
          <Typography variant="caption" sx={{ color: c.faint }}>
            Hover a bar to preview its mass and scenarios; click to pin and scroll the full list.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
