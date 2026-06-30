import { useState } from 'react';
import { Box, Collapse, Link, Stack, Tooltip, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { presets } from '@model/presets';
import { dataset } from '@model/dataset';
import { useBeliefs } from '@shell/store';
import { c, fonts } from '@shell/theme';

const sectionLabel = {
  fontFamily: fonts.display,
  fontSize: '0.7rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: c.mute,
};

/** Color the accuracy meter: low = amber (more inferred), high = teal (well-pinned). */
function accuracyColor(a: number): string {
  return a >= 0.66 ? c.teal : a >= 0.45 ? c.amber : c.red;
}

export function Presets() {
  const activePresetId = useBeliefs((s) => s.activePresetId);
  const applyPreset = useBeliefs((s) => s.applyPreset);
  const [openId, setOpenId] = useState<string | null>(null);

  const active = presets.find((p) => p.id === activePresetId);

  return (
    <Box>
      <Typography sx={{ ...sectionLabel, mb: 0.25 }}>Belief presets</Typography>
      <Typography sx={{ fontSize: '0.72rem', color: c.faint, mb: 1.25 }}>
        load a public figure's cited views · accuracy = how directly their record pins these factors
      </Typography>

      <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75}>
        {presets.map((p) => {
          const selected = p.id === activePresetId;
          return (
            <Tooltip key={p.id} title={p.summary} arrow placement="top">
              <Box
                role="button"
                tabIndex={0}
                onClick={() => applyPreset(p.id)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && applyPreset(p.id)}
                sx={{
                  cursor: 'pointer',
                  px: 1,
                  py: 0.6,
                  borderRadius: 1.5,
                  border: `1px solid ${selected ? c.teal : c.line}`,
                  bgcolor: selected ? 'rgba(52,211,181,0.12)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  transition: 'border-color 120ms, background-color 120ms',
                  '&:hover': { borderColor: selected ? c.teal : c.mute },
                }}
              >
                <Typography sx={{ fontFamily: fonts.display, fontSize: '0.76rem', color: selected ? c.bone : c.mute, lineHeight: 1.1 }}>
                  {p.name}
                </Typography>
                <Box
                  sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: accuracyColor(p.accuracy), flexShrink: 0 }}
                  title={`estimated accuracy ${Math.round(p.accuracy * 100)}%`}
                />
              </Box>
            </Tooltip>
          );
        })}
      </Stack>

      {active && (
        <Box sx={{ mt: 1.5, p: 1.5, border: `1px solid ${c.line}`, borderRadius: 1.5, bgcolor: c.panel2 }}>
          <Typography sx={{ fontFamily: fonts.display, fontSize: '0.82rem', fontWeight: 600, color: c.bone }}>
            {active.name}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: c.mute, mb: 1 }}>{active.role}</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: c.bone, lineHeight: 1.45, mb: 1.25 }}>
            {active.summary}
          </Typography>

          {/* accuracy meter */}
          <Tooltip title={active.accuracyNote} arrow placement="top">
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: active.pdoom ? 0.75 : 1 }}>
              <Typography sx={{ fontSize: '0.68rem', color: c.mute, width: 96 }}>est. accuracy</Typography>
              <Box sx={{ position: 'relative', flex: 1, height: 6, bgcolor: c.ink, borderRadius: 99 }}>
                <Box sx={{ position: 'absolute', height: '100%', width: `${active.accuracy * 100}%`, bgcolor: accuracyColor(active.accuracy), borderRadius: 99 }} />
              </Box>
              <Typography sx={{ fontFamily: fonts.mono, fontSize: '0.72rem', color: c.bone, width: 34, textAlign: 'right' }}>
                {Math.round(active.accuracy * 100)}%
              </Typography>
            </Stack>
          </Tooltip>

          {active.pdoom && (
            <Typography sx={{ fontSize: '0.72rem', color: c.mute, mb: 1 }}>
              Stated risk:{' '}
              <Box component="span" sx={{ fontFamily: fonts.mono, color: c.bone }}>{active.pdoom}</Box>
            </Typography>
          )}

          <Link
            component="button"
            type="button"
            onClick={() => setOpenId(openId === active.id ? null : active.id)}
            sx={{ fontSize: '0.72rem', color: c.teal, textDecorationColor: c.teal }}
          >
            {openId === active.id ? 'Hide' : 'Sources & reasoning'}
          </Link>

          <Collapse in={openId === active.id}>
            <Box sx={{ mt: 1 }}>
              {active.citations.map((cit, i) => (
                <Box key={i} sx={{ mb: 1.25 }}>
                  <Link
                    href={cit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ fontSize: '0.72rem', color: c.bone, display: 'inline-flex', alignItems: 'center', gap: 0.4, textDecorationColor: c.faint }}
                  >
                    {cit.label}
                    <OpenInNewIcon sx={{ fontSize: 11, color: c.faint }} />
                  </Link>
                  {cit.quote && (
                    <Typography sx={{ fontSize: '0.7rem', color: c.mute, fontStyle: 'italic', borderLeft: `2px solid ${c.line}`, pl: 1, mt: 0.4, lineHeight: 1.4 }}>
                      {cit.quote}
                    </Typography>
                  )}
                </Box>
              ))}

              {active.factorNotes && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography sx={{ ...sectionLabel, fontSize: '0.64rem', mb: 0.75 }}>How each factor was set</Typography>
                  {dataset.factors.map((f) =>
                    active.factorNotes?.[f.id] ? (
                      <Box key={f.id} sx={{ mb: 0.6 }}>
                        <Typography component="span" sx={{ fontFamily: fonts.display, fontSize: '0.68rem', color: c.bone }}>
                          {f.label}:{' '}
                        </Typography>
                        <Typography component="span" sx={{ fontSize: '0.68rem', color: c.mute, lineHeight: 1.4 }}>
                          {active.factorNotes[f.id]}
                        </Typography>
                      </Box>
                    ) : null,
                  )}
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}
