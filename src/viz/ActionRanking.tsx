import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import type { RankedAction } from '@engine/actions';
import { valueColor } from '@shell/theme';

interface Props {
  ranked: RankedAction[];
  baselineEv: number;
}

/** Ranked actions by EV gain vs. baseline. The top positive one is the max-EV action. */
export function ActionRanking({ ranked, baselineEv }: Props) {
  const maxAbs = Math.max(0.0001, ...ranked.map((r) => Math.abs(r.evGain)));
  const best = ranked.find((r) => r.evGain > 0);

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Actions ranked by EV gain (baseline EV {baselineEv.toFixed(2)})
      </Typography>
      {best ? (
        <Chip
          label={`Max-EV action: ${best.action.label}  (+${best.evGain.toFixed(3)})`}
          sx={{ mb: 1.5, bgcolor: '#3fb950', color: '#0d1117', fontWeight: 600 }}
        />
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          No modeled action improves EV under the current beliefs.
        </Typography>
      )}
      <Stack spacing={1}>
        {ranked.map((r) => {
          const pct = (Math.abs(r.evGain) / maxAbs) * 100;
          const positive = r.evGain >= 0;
          return (
            <Tooltip key={r.action.id} title={r.action.description} placement="top-start" arrow>
              <Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">{r.action.label}</Typography>
                  <Typography variant="body2" sx={{ color: valueColor(Math.sign(r.evGain)) }}>
                    {r.evGain >= 0 ? '+' : ''}
                    {r.evGain.toFixed(3)}
                  </Typography>
                </Stack>
                <Box sx={{ position: 'relative', height: 8, bgcolor: '#21262d', borderRadius: 1, mt: 0.3 }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      left: positive ? '50%' : `${50 - pct / 2}%`,
                      width: `${pct / 2}%`,
                      height: '100%',
                      bgcolor: positive ? '#3fb950' : '#f85149',
                      borderRadius: 1,
                    }}
                  />
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
}
