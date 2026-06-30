import { Box, Typography } from '@mui/material';

export interface DiffPoint {
  linear: number;
  cached: number;
  probability: number;
  reasoned: boolean;
}

interface Props {
  points: DiffPoint[];
}

/**
 * Scatter of cached (hand-reasoned) value vs. linear value per scenario. Points
 * off the diagonal are where the simple linear story disagrees with careful
 * reasoning — the residual is a direct measure of how non-linear the space is.
 */
export function EvaluatorDiff({ points }: Props) {
  const size = 320;
  const pad = 34;
  const plot = size - pad * 2;
  const toX = (v: number) => pad + ((v + 1) / 2) * plot;
  const toY = (v: number) => pad + ((1 - v) / 2) * plot;

  const reasoned = points.filter((p) => p.reasoned);
  const rms =
    reasoned.length > 0
      ? Math.sqrt(reasoned.reduce((a, p) => a + (p.cached - p.linear) ** 2, 0) / reasoned.length)
      : 0;
  const maxP = Math.max(0.0001, ...points.map((p) => p.probability));

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Cached vs. linear — residual measures non-linearity
      </Typography>
      <Typography variant="caption" color="text.secondary">
        RMS divergence over {reasoned.length} hand-reasoned cells: {rms.toFixed(3)}
      </Typography>
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Evaluator comparison scatter" style={{ maxWidth: 360 }}>
        <rect x={pad} y={pad} width={plot} height={plot} fill="none" stroke="#30363d" />
        <line x1={toX(-1)} y1={toY(-1)} x2={toX(1)} y2={toY(1)} stroke="#8b949e" strokeDasharray="4 4" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toX(p.linear)}
            cy={toY(p.cached)}
            r={2 + 6 * (p.probability / maxP)}
            fill={p.reasoned ? '#d29922' : '#3b4048'}
            opacity={p.reasoned ? 0.85 : 0.35}
            stroke={p.reasoned ? '#0d1117' : 'none'}
          >
            <title>{`linear ${p.linear.toFixed(2)} vs cached ${p.cached.toFixed(2)} · P=${(p.probability * 100).toFixed(1)}%`}</title>
          </circle>
        ))}
        <text x={size / 2} y={size - 6} fill="#8b949e" fontSize={11} textAnchor="middle">
          linear value →
        </text>
        <text x={10} y={size / 2} fill="#8b949e" fontSize={11} textAnchor="middle" transform={`rotate(-90 10 ${size / 2})`}>
          cached value →
        </text>
      </svg>
    </Box>
  );
}
