import { Box, Typography } from '@mui/material';
import { c, fonts, valueColor } from '@shell/theme';

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
 * Scatter of cached (hand-reasoned) value vs. linear value per scenario. Points off
 * the diagonal are where careful reasoning disagrees with the simple additive model —
 * the residual is a direct measure of how non-linear the space is.
 */
export function EvaluatorDiff({ points }: Props) {
  const size = 340;
  const pad = 38;
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
        Cached vs. linear
      </Typography>
      <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 1 }}>
        residual measures how non-linear the space is · RMS divergence over {reasoned.length} cells{' '}
        <Box component="span" sx={{ fontFamily: fonts.mono, color: c.bone }}>{rms.toFixed(3)}</Box>
      </Typography>
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Evaluator comparison scatter" style={{ maxWidth: 380 }}>
        <rect x={pad} y={pad} width={plot} height={plot} fill="none" stroke={c.line} />
        <line x1={toX(-1)} y1={toY(-1)} x2={toX(1)} y2={toY(1)} stroke={c.faint} strokeDasharray="3 4" />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={toX(p.linear)}
            cy={toY(p.cached)}
            r={2 + 6 * (p.probability / maxP)}
            fill={valueColor(p.cached)}
            opacity={0.78}
            stroke={c.ink}
            strokeWidth={0.5}
          >
            <title>{`linear ${p.linear.toFixed(2)} vs cached ${p.cached.toFixed(2)} · P=${(p.probability * 100).toFixed(1)}%`}</title>
          </circle>
        ))}
        <text x={size / 2} y={size - 6} fill={c.mute} fontSize={11} fontFamily={fonts.display} textAnchor="middle">
          linear value →
        </text>
        <text x={12} y={size / 2} fill={c.mute} fontSize={11} fontFamily={fonts.display} textAnchor="middle" transform={`rotate(-90 12 ${size / 2})`}>
          hand-reasoned value →
        </text>
      </svg>
    </Box>
  );
}
