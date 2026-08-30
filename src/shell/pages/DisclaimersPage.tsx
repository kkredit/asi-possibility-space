import { Box, Link, Typography } from '@mui/material';
import { c, fonts } from '@shell/theme';

const h = { fontFamily: fonts.display, fontWeight: 700, fontSize: '1.15rem', color: c.bone, mt: 4, mb: 1.25 };
const p = { color: c.mute, lineHeight: 1.7, mb: 1.5 };

export function DisclaimersPage() {
  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', py: { xs: 3, md: 5 }, px: 2 }}>
      <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.6rem', color: c.bone, mb: 2 }}>
        Disclaimers
      </Typography>

      <Typography sx={h}>1 · This is about ASI, not about whether the current paradigm gets there</Typography>
      <Typography sx={p}>
        This model reasons about <b>artificial superintelligence</b>: in Bostrom&rsquo;s canonical
        definition, &ldquo;an intellect that greatly exceeds the cognitive performance of humans in
        virtually all domains of interest.&rdquo; Every factor, scenario and outcome here is
        conditioned on such a thing eventually existing. The model takes <em>no position</em> on
        whether today&rsquo;s paradigm (large language models, current training methods, current
        hardware trajectories) is the road that leads there.
      </Typography>
      <Typography sx={p}>
        Many thoughtful people believe the current paradigm will <em>not</em> produce ASI. That view
        is entirely compatible with this tool; it just cashes out <em>inside</em> the model rather
        than against it: expecting one or more paradigm shifts before superintelligence generally
        means longer timelines, which look like a <b>slower takeoff</b>, better odds that{' '}
        <b>alignment is solved in time</b>, and more mature <b>research portfolios</b> at the
        threshold. What paradigm skepticism does <em>not</em> do is rule ASI out in principle:
        the limitations of today&rsquo;s systems are facts about today&rsquo;s systems, not about
        the physics of intelligence.
      </Typography>
      <Typography sx={p}>
        If the underlying question is new to you, the canonical starting points:{' '}
        <Link href="https://en.wikipedia.org/wiki/Superintelligence:_Paths,_Dangers,_Strategies" target="_blank" rel="noopener" sx={{ color: c.accent }}>
          <em>Superintelligence</em> (Bostrom, 2014)
        </Link>{' '}
        for the structure of the problem,{' '}
        <Link href="https://en.wikipedia.org/wiki/Human_Compatible" target="_blank" rel="noopener" sx={{ color: c.accent }}>
          <em>Human Compatible</em> (Russell, 2019)
        </Link>{' '}
        for the control-problem framing, and{' '}
        <Link href="https://en.wikipedia.org/wiki/The_Alignment_Problem" target="_blank" rel="noopener" sx={{ color: c.accent }}>
          <em>The Alignment Problem</em> (Christian, 2020)
        </Link>{' '}
        for the machine-learning-grounded tour. The{' '}
        <Link href="#page=resources" sx={{ color: c.accent }}>
          Resources
        </Link>{' '}
        page introduces each of this model&rsquo;s questions with curated reading.
      </Typography>

      <Typography sx={h}>2 · The presets are unofficial reconstructions, not anyone&rsquo;s real views</Typography>
      <Typography sx={p}>
        Every belief preset is an <b>editorial estimate</b>: one reading of an entity&rsquo;s public
        statements, forced into this model&rsquo;s particular vocabulary of factors and states.
        That is squares into a round hole by construction: each of these thinkers has a unique
        belief system, with distinctions and dependencies this model does not represent, and none
        of them chose these numbers. Nothing in a preset purports to be anyone&rsquo;s actual
        views, and no figure or lab has endorsed their entry.
      </Typography>
      <Typography sx={p}>
        What the presets <em>do</em> offer is transparency about the reconstruction: every factor
        carries a sourcing note, an accuracy rating (how directly the public record pins that
        credence), and citations, and each preset&rsquo;s &ldquo;Sources &amp; reasoning&rdquo;
        view explains how its numbers were derived and where the model-implied results diverge
        from the entity&rsquo;s stated ones, and why. For anyone&rsquo;s real views, read their
        linked materials, not this model.
      </Typography>
    </Box>
  );
}
