import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { dataset } from '@model/dataset';
import type { ValueVector } from '@model/types';
import { valueColor } from '@shell/theme';

interface Props {
  ev: number;
  evVector: ValueVector;
}

export function EvHeadline({ ev, evVector }: Props) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Expected value
          </Typography>
          <Typography variant="h3" sx={{ color: valueColor(ev), fontWeight: 700, lineHeight: 1 }}>
            {ev >= 0 ? '+' : ''}
            {ev.toFixed(3)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            probability-weighted, scalar in [−1, +1]
          </Typography>
        </Box>
        <Box sx={{ flex: 1, width: '100%' }}>
          {dataset.valueDimensions.map((dim) => {
            const v = evVector[dim.id];
            return (
              <Tooltip key={dim.id} title={`${dim.lowLabel} (−1) … ${dim.highLabel} (+1)`} arrow placement="left">
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.3 }}>
                  <Typography variant="caption" sx={{ width: 80, color: 'text.secondary' }}>
                    {dim.label}
                  </Typography>
                  <Box sx={{ position: 'relative', flex: 1, height: 10, bgcolor: '#21262d', borderRadius: 1 }}>
                    <Box sx={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', bgcolor: '#484f58' }} />
                    <Box
                      sx={{
                        position: 'absolute',
                        height: '100%',
                        borderRadius: 1,
                        bgcolor: valueColor(v),
                        left: v >= 0 ? '50%' : `${50 + (v * 50)}%`,
                        width: `${Math.abs(v) * 50}%`,
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ width: 44, textAlign: 'right' }}>
                    {v >= 0 ? '+' : ''}
                    {v.toFixed(2)}
                  </Typography>
                </Stack>
              </Tooltip>
            );
          })}
        </Box>
      </Stack>
    </Paper>
  );
}
