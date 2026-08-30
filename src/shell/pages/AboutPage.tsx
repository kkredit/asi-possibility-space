import { Box, Typography } from '@mui/material';
import { c, fonts } from '@shell/theme';

/**
 * PLACEHOLDER — KK to write the real About page (what this site is, why it exists).
 * Keep it short and personal; the Resources page carries the background reading.
 */
export function AboutPage() {
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', py: { xs: 3, md: 5 }, px: 2 }}>
      <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.6rem', color: c.bone, mb: 2 }}>
        About this site
      </Typography>
      <Typography sx={{ color: c.mute, lineHeight: 1.7, mb: 2 }}>
        {/* placeholder */}
        The ASI Possibility Space is an instrument for reasoning about AI futures: set your
        credences over the questions that matter, and see what they imply, from the distribution
        over outcomes to where the leverage is and which beliefs are doing the work.
      </Typography>
      <Typography sx={{ color: c.faint, fontStyle: 'italic', lineHeight: 1.7 }}>
        (Placeholder: a personal introduction about what this site is and why it was created
        will go here.)
      </Typography>
    </Box>
  );
}
