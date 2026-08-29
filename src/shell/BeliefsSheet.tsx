import { useState } from 'react';
import { Box, Stack, SwipeableDrawer, Typography } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import { Controls } from '@shell/controls/Controls';
import { c, fonts, valueColor } from '@shell/theme';
import { fmtSigned } from '@viz/text';

interface Props {
  ev: number;
  pDoom: number;
  pDisempowered: number;
  pFlourishing: number;
}

/**
 * Mobile beliefs editor: results stay first on the page; the full Beliefs panel
 * lives in a swipeable bottom sheet behind a pinned pill button (the standard
 * "filters" pattern). A compact EV · p(doom) · p(disemp.) · p(flourish) strip is pinned
 * at the sheet's top, so slider drags give live feedback without any scrolling.
 */
export function BeliefsSheet({ ev, pDoom, pDisempowered, pFlourishing }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Pinned opener — shows the live EV so the pill doubles as a mini read-out. */}
      <Box
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: (t) => t.zIndex.appBar,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 2,
          py: 1,
          borderRadius: 999,
          bgcolor: c.panel2,
          border: `1px solid ${c.line}`,
          boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        <TuneIcon sx={{ fontSize: 18, color: c.accent }} />
        <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: '0.85rem', color: c.bone }}>
          Beliefs
        </Typography>
        <Typography sx={{ fontFamily: fonts.mono, fontSize: '0.78rem', color: valueColor(ev) }}>
          {fmtSigned(ev)}
        </Typography>
      </Box>

      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onClose={() => setOpen(false)}
        onOpen={() => setOpen(true)}
        disableSwipeToOpen
        keepMounted={false}
        slotProps={{
          paper: {
            sx: {
              height: '88dvh',
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              bgcolor: c.panel,
              backgroundImage: 'none',
              borderTop: `1px solid ${c.line}`,
            },
          },
        }}
      >
        {/* Grab handle + live read-out, pinned while the panel below scrolls. */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: c.panel, pb: 1, borderBottom: `1px solid ${c.line}` }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: c.line, mx: 'auto', mt: 1 }} />
          <Stack
            direction="row"
            sx={{
              justifyContent: "center",
              columnGap: 2.25,
              alignItems: "baseline",
              mt: 0.75,
              flexWrap: 'wrap'
            }}>
            <Typography sx={{ whiteSpace: 'nowrap', fontFamily: fonts.mono, fontSize: '0.8rem', color: c.mute }}>
              EV <Box component="span" sx={{ fontWeight: 700, color: valueColor(ev) }}>{fmtSigned(ev)}</Box>
            </Typography>
            <Typography sx={{ whiteSpace: 'nowrap', fontFamily: fonts.mono, fontSize: '0.8rem', color: c.mute }}>
              p(doom) <Box component="span" sx={{ fontWeight: 700, color: valueColor(-Math.min(1, pDoom * 2)) }}>{Math.round(pDoom * 100)}%</Box>
            </Typography>
            <Typography sx={{ whiteSpace: 'nowrap', fontFamily: fonts.mono, fontSize: '0.8rem', color: c.mute }}>
              p(disemp.) <Box component="span" sx={{ fontWeight: 700, color: valueColor(-Math.min(1, pDisempowered * 2)) }}>{Math.round(pDisempowered * 100)}%</Box>
            </Typography>
            <Typography sx={{ whiteSpace: 'nowrap', fontFamily: fonts.mono, fontSize: '0.8rem', color: c.mute }}>
              p(flourish) <Box component="span" sx={{ fontWeight: 700, color: valueColor(Math.min(1, pFlourishing * 2)) }}>{Math.round(pFlourishing * 100)}%</Box>
            </Typography>
          </Stack>
        </Box>
        <Box sx={{ overflowY: 'auto', px: 2, pt: 1.5, pb: 4 }}>
          <Controls />
        </Box>
      </SwipeableDrawer>
    </>
  );
}
