import type { ReactNode } from 'react';
import { Paper } from '@mui/material';

/** A standard raised content panel with consistent padding and spacing. */
export function Panel({ children }: { children: ReactNode }) {
  return <Paper sx={{ p: { xs: 1.75, sm: 2.5 }, mb: 2 }}>{children}</Paper>;
}
