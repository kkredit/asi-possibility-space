import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { Factor, FactorReferenceKind } from '@model/types';
import { c, fonts, kindColor } from '@shell/theme';

const sectionLabel = {
  fontFamily: fonts.display,
  fontSize: '0.64rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: c.mute,
};

/** Accessible ("start here") kinds get the teal accent; primary sources stay muted. */
const REF_KIND: Record<FactorReferenceKind, { label: string; accessible: boolean }> = {
  podcast: { label: 'podcast', accessible: true },
  video: { label: 'video', accessible: true },
  post: { label: 'blog / essay', accessible: true },
  course: { label: 'course', accessible: true },
  paper: { label: 'paper', accessible: false },
  book: { label: 'book', accessible: false },
};

/**
 * The scholarly deep-dive for one factor: the debate in prose, the spectrum of
 * named positions, and linked works badged by kind (accessible entry points first).
 * Rendered inside the "learn more" Dialog in Controls.
 */
export function FactorBackground({ factor }: { factor: Factor }) {
  const bg = factor.background;
  if (!bg) {
    return (
      <Typography sx={{ fontSize: '0.8rem', color: c.mute }}>
        No background written for this factor yet.
      </Typography>
    );
  }
  const stateLabel = (id?: string) => factor.states.find((st) => st.id === id)?.label;

  return (
    <Box>
      <Typography sx={{ fontSize: '0.78rem', color: c.mute, fontStyle: 'italic', mb: 1.5, lineHeight: 1.5 }}>
        {factor.question}
      </Typography>

      {bg.paragraphs.map((p, i) => (
        <Typography key={i} sx={{ fontSize: '0.82rem', color: c.bone, lineHeight: 1.6, mb: 1.25 }}>
          {p}
        </Typography>
      ))}

      {bg.positions?.length ? (
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography sx={{ ...sectionLabel, mb: 0.75 }}>The spectrum of views</Typography>
          <Stack spacing={0.85}>
            {bg.positions.map((pos, i) => {
              const st = stateLabel(pos.state);
              return (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: kindColor[factor.kind],
                      flexShrink: 0,
                      mt: 0.6,
                    }}
                  />
                  <Box>
                    <Typography component="span" sx={{ fontFamily: fonts.display, fontSize: '0.76rem', fontWeight: 600, color: c.bone }}>
                      {pos.name}
                      {st ? (
                        <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: '0.64rem', color: c.faint, ml: 0.75 }}>
                          → {st}
                        </Box>
                      ) : null}
                    </Typography>
                    <Typography sx={{ fontSize: '0.76rem', color: c.mute, lineHeight: 1.45 }}>{pos.stance}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      ) : null}

      <Box sx={{ mt: 2 }}>
        <Typography sx={{ ...sectionLabel, mb: 0.85 }}>Reading & listening · start at the top</Typography>
        <Stack spacing={1.1}>
          {bg.references.map((ref, i) => {
            const meta = REF_KIND[ref.kind];
            return (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                <Chip
                  label={meta.label}
                  size="small"
                  sx={{
                    height: 18,
                    flexShrink: 0,
                    fontFamily: fonts.mono,
                    fontSize: '0.58rem',
                    letterSpacing: '0.02em',
                    color: meta.accessible ? c.teal : c.faint,
                    bgcolor: 'transparent',
                    border: `1px solid ${meta.accessible ? c.teal : c.line}`,
                    '& .MuiChip-label': { px: 0.7 },
                  }}
                />
                <Box>
                  <Link
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontSize: '0.78rem', color: c.bone, display: 'inline-flex', alignItems: 'center', gap: 0.4, textDecorationColor: c.faint }}
                  >
                    {ref.label}
                    <OpenInNewIcon sx={{ fontSize: 12, color: c.faint }} />
                  </Link>
                  {ref.note ? (
                    <Typography sx={{ fontSize: '0.72rem', color: c.mute, lineHeight: 1.4 }}>{ref.note}</Typography>
                  ) : null}
                </Box>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
