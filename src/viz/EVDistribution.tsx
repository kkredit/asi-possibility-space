import { Box, Typography } from '@mui/material';
import type { DistributionBin } from '@engine/analyze';
import { valueColor } from '@shell/theme';

interface Props {
  bins: DistributionBin[];
  ev: number;
}

/** Histogram of probability mass over the scalar value axis [-1, 1]. */
export function EVDistribution({ bins, ev }: Props) {
  const width = 520;
  const height = 200;
  const padding = { top: 16, right: 16, bottom: 28, left: 36 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const maxP = Math.max(0.0001, ...bins.map((b) => b.probability));
  const barW = plotW / bins.length;
  const xOfValue = (v: number) => padding.left + ((v + 1) / 2) * plotW;

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Outcome distribution (probability mass by value)
      </Typography>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Outcome distribution">
        {bins.map((b, i) => {
          const h = (b.probability / maxP) * plotH;
          const mid = (b.lo + b.hi) / 2;
          return (
            <rect
              key={i}
              x={padding.left + i * barW + 1}
              y={padding.top + plotH - h}
              width={barW - 2}
              height={h}
              fill={valueColor(mid)}
              opacity={0.85}
            >
              <title>{`value ${b.lo.toFixed(1)}…${b.hi.toFixed(1)}: ${(b.probability * 100).toFixed(1)}%`}</title>
            </rect>
          );
        })}
        {/* zero line */}
        <line
          x1={xOfValue(0)}
          x2={xOfValue(0)}
          y1={padding.top}
          y2={padding.top + plotH}
          stroke="#8b949e"
          strokeDasharray="3 3"
        />
        {/* EV marker */}
        <line
          x1={xOfValue(ev)}
          x2={xOfValue(ev)}
          y1={padding.top - 4}
          y2={padding.top + plotH}
          stroke="#58a6ff"
          strokeWidth={2}
        />
        <text x={xOfValue(ev)} y={padding.top - 6} fill="#58a6ff" fontSize={11} textAnchor="middle">
          EV {ev.toFixed(2)}
        </text>
        {[-1, 0, 1].map((v) => (
          <text
            key={v}
            x={xOfValue(v)}
            y={height - 8}
            fill="#8b949e"
            fontSize={11}
            textAnchor="middle"
          >
            {v}
          </text>
        ))}
        <text x={padding.left} y={height - 8} fill="#f85149" fontSize={10} textAnchor="start">
          worse
        </text>
        <text x={width - padding.right} y={height - 8} fill="#3fb950" fontSize={10} textAnchor="end">
          better
        </text>
      </svg>
    </Box>
  );
}
