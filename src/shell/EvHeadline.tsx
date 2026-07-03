import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { dataset } from '@model/dataset';
import type { ValueVector } from '@model/types';
import { c, fonts, valueColor, valueGradient } from '@shell/theme';
import { InfoTip } from '@viz/InfoTip';

interface Props {
  ev: number;
  evVector: ValueVector;
  /** Modeled p(doom): probability mass on extinction-level outcomes (survival < −0.5). */
  pDoom: number;
}

/** Position of a value in [-1,1] as a percent across a gauge. */
const pct = (v: number) => `${((Math.max(-1, Math.min(1, v)) + 1) / 2) * 100}%`;

function DimensionBar({ label, low, high, value }: { label: string; low: string; high: string; value: number }) {
  return (
    <Tooltip title={`${low} (−1) … ${high} (+1)`} arrow placement="left">
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.6 }}>
        <Typography sx={{ width: 78, fontSize: '0.72rem', color: c.mute, fontFamily: fonts.display }}>
          {label}
        </Typography>
        <Box sx={{ position: 'relative', flex: 1, height: 6, bgcolor: c.panel2, borderRadius: 99 }}>
          <Box sx={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: '1px', bgcolor: c.line }} />
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              height: '100%',
              borderRadius: 99,
              bgcolor: valueColor(value),
              left: value >= 0 ? '50%' : pct(value),
              width: `${Math.abs(value) * 50}%`,
            }}
          />
        </Box>
        <Typography sx={{ width: 46, textAlign: 'right', fontFamily: fonts.mono, fontSize: '0.74rem', color: c.bone }}>
          {value >= 0 ? '+' : ''}
          {value.toFixed(2)}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

export function EvHeadline({ ev, evVector, pDoom }: Props) {
  return (
    <Paper sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2.5, md: 4 }} alignItems="stretch">
        {/* Left: the number + the spectrum gauge (the signature instrument readout) */}
        <Box sx={{ flex: 1.2, minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: c.mute }}>
            Expected value of the future
          </Typography>
          <Stack direction="row" alignItems="baseline" spacing={1.5} sx={{ mt: 0.5, mb: 2 }}>
            <Typography
              sx={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: { xs: '2.6rem', sm: '3.2rem' }, lineHeight: 0.9, color: valueColor(ev) }}
            >
              {ev >= 0 ? '+' : '−'}
              {Math.abs(ev).toFixed(3)}
            </Typography>
            <Typography sx={{ fontFamily: fonts.mono, fontSize: '0.72rem', color: c.faint }}>
              / 1.000
            </Typography>
          </Stack>

          {/* spectrum gauge */}
          <Box sx={{ position: 'relative', height: 14, borderRadius: 99, background: valueGradient, opacity: 0.92 }}>
            {/* center tick */}
            <Box sx={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: '1px', bgcolor: 'rgba(255,255,255,0.3)' }} />
            {/* needle */}
            <Box
              sx={{
                position: 'absolute',
                left: pct(ev),
                top: -5,
                bottom: -5,
                width: 3,
                bgcolor: c.bone,
                borderRadius: 2,
                transform: 'translateX(-50%)',
                boxShadow: '0 0 0 2px rgba(11,14,20,0.7)',
              }}
            />
          </Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
            <Typography sx={{ fontSize: '0.66rem', color: c.red, fontFamily: fonts.display, letterSpacing: '0.04em' }}>
              ← extinction
            </Typography>
            <Typography sx={{ fontSize: '0.66rem', color: c.mute, fontFamily: fonts.mono }}>0</Typography>
            <Typography sx={{ fontSize: '0.66rem', color: c.teal, fontFamily: fonts.display, letterSpacing: '0.04em' }}>
              flourishing →
            </Typography>
          </Stack>

          {/* Second headline: modeled p(doom) — a different summary of the same futures. */}
          <Stack direction="row" alignItems="baseline" spacing={1.25} sx={{ mt: 2.25 }}>
            <Typography variant="overline" sx={{ color: c.mute, display: 'inline-flex', alignItems: 'center' }}>
              Modeled p(doom)
              <InfoTip>
                The probability mass this model puts on <b>extinction-level</b> outcomes
                (survival&nbsp;&lt;&nbsp;−0.5), under your current beliefs. It answers a different
                question than the expected value: EV is a weighted average <em>across all four value
                dimensions</em> (a mild-but-broad loss and a catastrophe can share an EV), while
                p(doom) is purely the <em>extinction tail</em>. Both are worth watching — they often
                disagree. This is the same quantity compared against public figures' stated p(doom)
                in the belief presets.
              </InfoTip>
            </Typography>
            <Typography sx={{ fontFamily: fonts.mono, fontWeight: 700, fontSize: '1.7rem', lineHeight: 0.9, color: valueColor(-Math.min(1, pDoom * 2)) }}>
              {Math.round(pDoom * 100)}%
            </Typography>
          </Stack>
        </Box>

        {/* Right: the value vector breakdown */}
        <Box sx={{ flex: 1, minWidth: { md: 260 } }}>
          <Typography variant="overline" sx={{ color: c.mute, display: 'block', mb: 1 }}>
            By dimension
          </Typography>
          {dataset.valueDimensions.map((dim) => (
            <DimensionBar key={dim.id} label={dim.label} low={dim.lowLabel} high={dim.highLabel} value={evVector[dim.id]} />
          ))}
        </Box>
      </Stack>
    </Paper>
  );
}
