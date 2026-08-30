import { Box, Typography } from '@mui/material';
import type { ConditionLine } from '@engine/index';
import { c, fonts } from '@shell/theme';

/** A titled list of factor-state conditions with their signed deltas (favorable / not). */
export function ConditionList({
  title,
  color,
  sign,
  lines,
}: {
  title: string;
  color: string;
  sign: string;
  lines: ConditionLine[];
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 220 }}>
      <Typography variant="caption" sx={{ color, fontFamily: fonts.display, fontWeight: 600 }}>{title}</Typography>
      {lines.length === 0 ? (
        <Typography variant="body2" sx={{ color: c.faint }}>Never, at these beliefs</Typography>
      ) : (
        lines.map((l) => (
          <Typography key={l.factorId + l.stateId} variant="body2" sx={{ color: c.bone }}>
            {l.label} = {l.stateLabel}{' '}
            <Box component="span" sx={{ fontFamily: fonts.mono, color }}>{sign}{l.delta.toFixed(3)}</Box>
          </Typography>
        ))
      )}
    </Box>
  );
}
