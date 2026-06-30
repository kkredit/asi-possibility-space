import { Box, Stack, Tooltip, Typography } from '@mui/material';
import type { RankedAction } from '@engine/actions';
import { c, fonts } from '@shell/theme';

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
        Best action to take now
      </Typography>
      <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 1.5 }}>
        each action ranked by the EV gain it produces vs. baseline{' '}
        <Box component="span" sx={{ fontFamily: fonts.mono, color: c.bone }}>
          {baselineEv >= 0 ? '+' : '−'}{Math.abs(baselineEv).toFixed(2)}
        </Box>
      </Typography>

      {best && (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 1,
            px: 1.5,
            py: 0.75,
            mb: 2,
            borderRadius: 1.5,
            border: `1px solid ${c.teal}`,
            bgcolor: 'rgba(52,211,181,0.12)',
          }}
        >
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, color: c.bone, fontSize: '0.9rem' }}>
            {best.action.label}
          </Typography>
          <Typography sx={{ fontFamily: fonts.mono, color: c.teal, fontSize: '0.85rem' }}>
            +{best.evGain.toFixed(3)} EV
          </Typography>
        </Box>
      )}

      <Stack spacing={1.5}>
        {ranked.map((r) => {
          const frac = Math.abs(r.evGain) / maxAbs;
          const positive = r.evGain >= 0;
          return (
            <Tooltip key={r.action.id} title={r.action.description} placement="top-start" arrow>
              <Box>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.4 }}>
                  <Typography variant="body2" sx={{ color: c.bone }}>
                    {r.action.label}
                  </Typography>
                  <Typography sx={{ fontFamily: fonts.mono, fontSize: '0.8rem', color: positive ? c.teal : c.red }}>
                    {r.evGain >= 0 ? '+' : '−'}
                    {Math.abs(r.evGain).toFixed(3)}
                  </Typography>
                </Stack>
                {/* diverging bar from the center */}
                <Box sx={{ position: 'relative', height: 7, bgcolor: c.panel2, borderRadius: 99 }}>
                  <Box sx={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: '1px', bgcolor: c.line }} />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      height: '100%',
                      borderRadius: 99,
                      left: positive ? '50%' : `${50 - (frac * 50)}%`,
                      width: `${frac * 50}%`,
                      bgcolor: positive ? c.teal : c.red,
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
