import type { ReactNode } from 'react';
import { Box, Tooltip } from '@mui/material';
import { c, fonts } from '@shell/theme';

/**
 * A quiet "ⓘ" affordance that reveals fuller explanation on hover, so detailed copy
 * can live out of the default view without being lost. Place next to a heading.
 */
export function InfoTip({ children, label = 'i' }: { children: ReactNode; label?: string }) {
  return (
    <Tooltip title={<Box sx={{ fontFamily: fonts.body, lineHeight: 1.5, py: 0.25 }}>{children}</Box>} arrow placement="top">
      <Box
        component="span"
        sx={{
          ml: 0.5,
          width: 15,
          height: 15,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          border: `1px solid ${c.line}`,
          color: c.faint,
          fontFamily: fonts.body,
          fontSize: '0.62rem',
          fontStyle: 'italic',
          cursor: 'help',
          lineHeight: 1,
          '&:hover': { color: c.bone, borderColor: c.faint },
        }}
      >
        {label}
      </Box>
    </Tooltip>
  );
}
