import { Box, Typography } from '@mui/material';
import type { DistributionBin } from '@engine/analyze';
import { c, fonts, valueColor } from '@shell/theme';

interface Props {
  bins: DistributionBin[];
  ev: number;
}

/** Histogram of probability mass over the scalar value axis [-1, 1]. */
export function EVDistribution({ bins, ev }: Props) {
  const width = 560;
  const height = 224;
  const padding = { top: 26, right: 18, bottom: 46, left: 18 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const plotBottom = padding.top + plotH;
  const maxP = Math.max(0.0001, ...bins.map((b) => b.probability));
  const barW = plotW / bins.length;
  const xOf = (v: number) => padding.left + ((v + 1) / 2) * plotW;
  // keep the EV label inside the frame at the extremes
  const evAnchor = ev > 0.78 ? 'end' : ev < -0.78 ? 'start' : 'middle';

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Outcome distribution
      </Typography>
      <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 1 }}>
        probability mass across the value spectrum
      </Typography>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Outcome distribution">
        <line x1={padding.left} x2={width - padding.right} y1={plotBottom} y2={plotBottom} stroke={c.line} />
        {bins.map((b, i) => {
          const h = (b.probability / maxP) * plotH;
          const mid = (b.lo + b.hi) / 2;
          return (
            <rect
              key={i}
              x={padding.left + i * barW + 1.5}
              y={plotBottom - h}
              width={barW - 3}
              height={h}
              rx={2}
              fill={valueColor(mid)}
              opacity={0.9}
            >
              <title>{`value ${b.lo.toFixed(1)}…${b.hi.toFixed(1)}: ${(b.probability * 100).toFixed(1)}%`}</title>
            </rect>
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
    </Box>
  );
}
