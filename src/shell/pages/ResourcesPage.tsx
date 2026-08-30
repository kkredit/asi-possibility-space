import { Box, Stack, Typography } from '@mui/material';
import { dataset } from '@model/dataset';
import type { Factor, Subfactor } from '@model/types';
import { FactorBackground } from '@viz/FactorBackground';
import { c, fonts, kindColor } from '@shell/theme';

/**
 * The "Read more" content of every factor and subfactor, reorganized as
 * documentation: a sidebar TOC and sections that introduce the issues in a
 * readable order (the objective questions, the levers, then the alignment
 * deep dive). All prose/positions/reading lists come from the same
 * factorBackground content the modals use — nothing is duplicated.
 */

interface Section {
  id: string;
  title: string;
  blurb: string;
  entries: (Factor | Subfactor)[];
}

function sections(): Section[] {
  const factors = dataset.factors;
  const subs = dataset.subfactors ?? [];
  const byKind = (kind: string) => factors.filter((f) => f.kind === kind);
  return [
    {
      id: 'objective',
      title: 'The objective questions',
      blurb:
        'Structural facts, true the same way in any universe. You cannot move them, only discover which way they point, by research. They set which futures are even reachable.',
      entries: byKind('objective'),
    },
    {
      id: 'levers',
      title: 'The world at ASI onset: the levers',
      blurb:
        'Features of the world at the threshold that our choices substantially move: who holds the frontier, whether alignment and control actually ship, whether a coordination regime exists.',
      entries: byKind('influenceable'),
    },
    {
      id: 'problem',
      title: 'The alignment problem, in depth',
      blurb:
        'The deep dive under "how hard is alignment": four objective subquestions that together derive the difficulty: legibility, specifiability, corrigibility, and whether oversight can scale in principle.',
      entries: subs.filter((s) => s.kind === 'objective'),
    },
    {
      id: 'portfolio',
      title: 'The research portfolio',
      blurb:
        'The four research bets that drive "do we solve it in time", each gated by one of the objective questions above: a direction only pays off in worlds where it can work.',
      entries: subs.filter((s) => s.kind === 'influenceable'),
    },
  ];
}

const anchorId = (id: string) => `res-${id}`;

export function ResourcesPage() {
  const secs = sections();
  return (
    <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start', py: { xs: 2, md: 4 } }}>
      {/* Sidebar TOC (docs-style), hidden on small screens. */}
      <Box
        component="nav"
        sx={{
          width: 240,
          flexShrink: 0,
          position: 'sticky',
          top: 16,
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          display: { xs: 'none', md: 'block' },
          borderRight: `1px solid ${c.line}`,
          pr: 2,
        }}
      >
        {secs.map((sec) => (
          <Box key={sec.id} sx={{ mb: 1.75 }}>
            <Typography
              onClick={() => document.getElementById(anchorId(sec.id))?.scrollIntoView({ behavior: 'smooth' })}
              sx={{ fontFamily: fonts.display, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: c.mute, cursor: 'pointer', mb: 0.5, '&:hover': { color: c.accent } }}
            >
              {sec.title}
            </Typography>
            {sec.entries.map((e) => (
              <Typography
                key={e.id}
                onClick={() => document.getElementById(anchorId(e.id))?.scrollIntoView({ behavior: 'smooth' })}
                sx={{ fontSize: '0.78rem', color: c.faint, cursor: 'pointer', py: 0.3, pl: 1, borderLeft: `2px solid transparent`, '&:hover': { color: c.bone, borderLeftColor: kindColor[e.kind] } }}
              >
                {e.label}
              </Typography>
            ))}
          </Box>
        ))}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0, maxWidth: 760 }}>
        <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.6rem', color: c.bone }}>
          Resources
        </Typography>
        <Typography sx={{ color: c.mute, lineHeight: 1.7, mt: 1, mb: 4 }}>
          The questions this model is built from, introduced one at a time: what each one asks,
          the named positions in its debate, and curated reading, accessible entry points
          first, primary sources after. The same material backs the “read more” links beside
          every slider.
        </Typography>

        {secs.map((sec) => (
          <Box key={sec.id} id={anchorId(sec.id)} sx={{ mb: 5, scrollMarginTop: 16 }}>
            <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.2rem', color: c.bone, borderBottom: `1px solid ${c.line}`, pb: 0.75 }}>
              {sec.title}
            </Typography>
            <Typography sx={{ color: c.mute, fontSize: '0.88rem', lineHeight: 1.65, mt: 1, mb: 3 }}>
              {sec.blurb}
            </Typography>

            {sec.entries.map((e) => (
              <Box key={e.id} id={anchorId(e.id)} sx={{ mb: 4, scrollMarginTop: 16 }}>
                <Stack direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: kindColor[e.kind], flexShrink: 0 }} />
                  <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: '1.02rem', color: c.bone }}>
                    {e.label}
                  </Typography>
                </Stack>
                <Typography sx={{ color: c.mute, fontStyle: 'italic', fontSize: '0.86rem', mt: 0.25, mb: 1.25 }}>
                  {e.question}
                </Typography>
                {e.background ? (
                  <FactorBackground factor={e} showQuestion={false} />
                ) : (
                  <Typography sx={{ color: c.faint, fontSize: '0.85rem' }}>{e.description}</Typography>
                )}
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
