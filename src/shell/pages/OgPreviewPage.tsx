import { Box, Typography } from '@mui/material';
import { dataset } from '@model/dataset';
import { presets } from '@model/presets';
import { bannerSvg } from '@shell/ogPreview';
import { useBeliefs } from '@shell/store';
import type { SharedBeliefs } from '@shell/urlBeliefs';
import { c, fonts } from '@shell/theme';

/**
 * TEMPORARY preview gallery (#page=preview) for eyeballing the social/chat link
 * banners in-app. Renders bannerSvg(...) inline, scaled to fit. Safe to delete
 * along with its nav link and the 'preview' page id once reviewed.
 */
function Banner({ label, shared }: { label: string; shared: SharedBeliefs | null }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography sx={{ fontFamily: fonts.display, fontSize: '0.9rem', fontWeight: 600, color: c.bone, mb: 1 }}>
        {label}
        <Box component="span" sx={{ color: c.faint, fontWeight: 400, ml: 1 }}>· 1200×630</Box>
      </Typography>
      <Box
        sx={{
          maxWidth: 720,
          borderRadius: 2,
          overflow: 'hidden',
          border: `1px solid ${c.line}`,
          '& svg': { display: 'block', width: '100%', height: 'auto' },
        }}
        dangerouslySetInnerHTML={{ __html: bannerSvg(shared) }}
      />
    </Box>
  );
}

export function OgPreviewPage() {
  const s = useBeliefs();
  const live: SharedBeliefs = {
    credences: s.credences,
    subCredences: s.subCredences,
    weights: s.weights,
    probabilityModel: s.probabilityModel,
    alignmentMode: s.alignmentMode,
  };
  const asShared = (id: string): SharedBeliefs => {
    const p = presets.find((x) => x.id === id)!;
    return {
      credences: { ...dataset.baselineCredences, ...p.credences },
      subCredences: { ...dataset.subBaseline!, ...(p.subCredences ?? {}) } as SharedBeliefs['subCredences'],
      weights: p.weights ?? dataset.defaultWeights,
      probabilityModel: 'bayesNet',
      alignmentMode: 'derived',
    };
  };

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', py: { xs: 3, md: 5 }, px: 2 }}>
      <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.6rem', color: c.bone, mb: 1 }}>
        Link preview banners
      </Typography>
      <Typography sx={{ color: c.faint, fontSize: '0.82rem', mb: 4 }}>
        Temporary gallery. The general banner is what every shared link shows today; the per-beliefs
        cards are the dormant feature (docs/SOCIAL-PREVIEW.md) rendered here for review.
      </Typography>

      <Banner label="General (every link, today)" shared={null} />
      <Banner label="Per-beliefs · your current beliefs" shared={live} />
      <Banner label="Per-beliefs · Yudkowsky preset" shared={asShared('yudkowsky')} />
      <Banner label="Per-beliefs · LeCun preset" shared={asShared('lecun')} />
    </Box>
  );
}
