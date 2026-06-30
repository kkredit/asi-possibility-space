import { useState } from 'react';
import {
  Box,
  Collapse,
  FormControl,
  Link,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { Preset } from '@model/types';
import { presets } from '@model/presets';
import { dataset } from '@model/dataset';
import { analyze, cachedEvaluator } from '@engine/index';
import { useBeliefs } from '@shell/store';
import { c, fonts, valueColor } from '@shell/theme';

/** Each preset's own expected value (its credences + its weights), for color-coding. */
const presetEv: Record<string, number> = Object.fromEntries(
  presets.map((p) => [
    p.id,
    analyze(dataset, p.credences, p.weights ?? dataset.defaultWeights, cachedEvaluator).ev,
  ]),
);

const fmtEv = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`;

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

/** Individuals show "Name (Affiliation)"; orgs show just the org name. */
function displayName(p: Preset): string {
  return p.affiliation ? `${p.name} (${p.affiliation})` : p.name;
}

const people = presets.filter((p) => p.category === 'person');
const labs = presets.filter((p) => p.category === 'lab');

function presetItem(p: Preset) {
  return (
    <MenuItem key={p.id} value={p.id} sx={{ fontSize: '0.82rem' }}>
      <Box component="span" sx={{ flex: 1 }}>{displayName(p)}</Box>
      <Box
        component="span"
        title={`expected value ${fmtEv(presetEv[p.id])}`}
        sx={{ fontFamily: fonts.mono, fontSize: '0.74rem', color: valueColor(presetEv[p.id]), ml: 1.5 }}
      >
        {fmtEv(presetEv[p.id])}
      </Box>
    </MenuItem>
  );
}

export function Presets() {
  const activePresetId = useBeliefs((s) => s.activePresetId);
  const applyPreset = useBeliefs((s) => s.applyPreset);
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);

  const active = presets.find((p) => p.id === activePresetId);

  const copyLink = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Box>
      <Typography sx={{ ...sectionLabel, mb: 0.25 }}>Belief presets</Typography>
      <Typography sx={{ fontSize: '0.72rem', color: c.faint, mb: 1 }}>
        load a cited public view · value = their expected value (red extinction → teal flourishing) ·
        mapping accuracy shown once selected
      </Typography>

      <FormControl fullWidth size="small">
        <Select
          value={active ? active.id : ''}
          displayEmpty
          onChange={(e) => applyPreset(e.target.value)}
          renderValue={(val) => {
            const p = presets.find((x) => x.id === val);
            return p ? displayName(p) : <Box component="span" sx={{ color: c.faint }}>Choose a figure or lab…</Box>;
          }}
          sx={{ fontFamily: fonts.display, fontSize: '0.84rem', '& .MuiSelect-select': { display: 'flex', alignItems: 'center' } }}
          MenuProps={{ PaperProps: { sx: { maxHeight: 420, bgcolor: c.panel, border: `1px solid ${c.line}` } } }}
        >
          <ListSubheader sx={{ ...sectionLabel, bgcolor: c.panel, lineHeight: '28px', color: c.faint }}>People</ListSubheader>
          {people.map(presetItem)}
          <ListSubheader sx={{ ...sectionLabel, bgcolor: c.panel, lineHeight: '28px', color: c.faint }}>Labs</ListSubheader>
          {labs.map(presetItem)}
        </Select>
      </FormControl>

      {active && (
        <Box sx={{ mt: 1.5, p: 1.5, border: `1px solid ${c.line}`, borderRadius: 1.5, bgcolor: c.panel2 }}>
          <Typography sx={{ fontFamily: fonts.display, fontSize: '0.85rem', fontWeight: 600, color: c.bone }}>
            {displayName(active)}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: c.mute, mb: 1 }}>{active.role}</Typography>
          <Typography sx={{ fontSize: '0.78rem', color: c.bone, lineHeight: 1.45, mb: 1.25 }}>
            {active.summary}
          </Typography>

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

          <Stack direction="row" spacing={2} alignItems="center">
            <Link
              component="button"
              type="button"
              onClick={() => setShowSources((v) => !v)}
              sx={{ fontSize: '0.72rem', color: c.teal, textDecorationColor: c.teal }}
            >
              {showSources ? 'Hide' : 'Sources & reasoning'}
            </Link>
            <Link
              component="button"
              type="button"
              onClick={copyLink}
              sx={{ fontSize: '0.72rem', color: c.mute, textDecorationColor: c.faint }}
            >
              {copied ? 'Link copied ✓' : 'Copy link'}
            </Link>
          </Stack>

          <Collapse in={showSources}>
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
