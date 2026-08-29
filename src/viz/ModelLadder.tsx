import type { ReactNode } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { c, fonts } from '@shell/theme';
import { VizHeading } from '@viz/VizHeading';

export interface LadderRow {
  id: string;
  label: string;
  /** RMS divergence from the hand-reasoned surface (0 = identical). */
  rms: number;
  /** Optional gloss on what this model's residual means. */
  note?: string;
  /** Whether this is the reference (cached) row. */
  reference?: boolean;
}

interface Props {
  rows: LadderRow[];
  /** Optional fuller explanation, shown behind an info affordance on the heading. */
  info?: ReactNode;
}

/**
 * The "model ladder": each value model as a bar of its RMS divergence from the
 * hand-reasoned surface. Reading top (crudest) to bottom (best fit), the shrinking
 * bars decompose the surface — how much of each model's error is removed by the
 * next, more expressive, model. The reference row (cached) sits at zero by
 * definition. See docs/MODEL.md.
 */
export function ModelLadder({ rows, info }: Props) {
  const max = Math.max(0.0001, ...rows.map((r) => r.rms));
  return (
    <Box>
      <VizHeading title="Model ladder" info={info} />
      <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 1.5 }}>
        RMS divergence from the hand-reasoned surface, per value model. Shorter is a closer fit; the
        drop between rungs is the structure the more expressive model captures.
      </Typography>
      <Stack spacing={1.1}>
        {rows.map((r) => (
          <Box key={r.id}>
            <Stack
              direction="row"
              sx={{
                justifyContent: "space-between",
                alignItems: "baseline",
                mb: 0.3
              }}>
              <Tooltip title={r.note ?? ''} arrow disableHoverListener={!r.note}>
                <Typography
                  sx={{
                    fontFamily: fonts.display,
                    fontSize: '0.8rem',
                    color: r.reference ? c.accent : c.bone,
                    cursor: r.note ? 'help' : 'default',
                  }}
                >
                  {r.label}
                </Typography>
              </Tooltip>
              <Typography sx={{ fontFamily: fonts.mono, fontSize: '0.78rem', color: r.reference ? c.accent : c.mute }}>
                {r.reference ? '0 · reference' : r.rms.toFixed(3)}
              </Typography>
            </Stack>
            <Box sx={{ height: 6, bgcolor: c.panel2, borderRadius: 3, overflow: 'hidden' }}>
              <Box
                sx={{
                  height: '100%',
                  width: `${(r.rms / max) * 100}%`,
                  bgcolor: r.reference ? c.accent : c.slate,
                  borderRadius: 3,
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
