import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import { InfoTip } from '@viz/InfoTip';

/**
 * A panel's heading: a subtitle plus an optional info affordance holding the fuller
 * explanation. Standardises the title row shared across the viz components.
 */
export function VizHeading({ title, info }: { title: string; info?: ReactNode }) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        mb: 0.25
      }}>
      <Typography variant="subtitle2">{title}</Typography>
      {info ? <InfoTip>{info}</InfoTip> : null}
    </Stack>
  );
}
