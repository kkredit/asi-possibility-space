import { useMemo, useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
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
import type { KnownFactorId } from '@model/ids';
import { analyze, cachedEvaluator, deriveCredences, doomMass, reconcileJoint } from '@engine/index';
import { useBeliefs, type ProbabilityModel } from '@shell/store';
import { InfoTip } from '@viz/InfoTip';
import { fmtSigned } from '@viz/text';
import { c, fonts, valueColor } from '@shell/theme';

/** Analyze a preset under the ACTIVE probability model — the net's raked joint when in
 *  Bayes-net mode, independence×couplings otherwise — so the preset's EV and implied
 *  p(doom) match what the headline shows once that preset is loaded. Credences are
 *  merged over the baseline exactly as the store does when applying the preset, so a
 *  preset that omits a factor still analyzes with a full distribution. */
function analyzePreset(p: Preset, model: ProbabilityModel) {
  const stated = { ...dataset.baselineCredences, ...p.credences };
  // The store loads presets in derived mode: the deep-dive derives tractability and
  // alignment-in-time from the preset's sub-credences. Mirror that here so the menu
  // EV matches the headline once loaded.
  const subs = { ...(dataset.subBaseline ?? {}), ...(p.subCredences ?? {}) };
  const credences = deriveCredences(dataset, stated, subs);
  const weights = p.weights ?? dataset.defaultWeights;
  const joint =
    model === 'bayesNet' && dataset.bayesNet
      ? reconcileJoint(dataset.bayesNet, dataset.factors, credences, credences).probability
      : undefined;
  return analyze(dataset, credences, weights, cachedEvaluator, {}, joint);
}


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

// Display order within each group: roughly by esteem / notoriety in the AI-risk
// conversation (Turing/Nobel laureates and the most-cited voices first; controversial
// figures included on the same footing). Ids not listed fall to the end. People are
// always shown above labs (the two groups render under separate subheaders).
const ESTEEM_ORDER = [
  // people
  'hinton', 'bengio', 'lecun', 'sutskever', 'yudkowsky', 'christiano', 'andreessen', 'acx', 'kokotajlo', 'yampolskiy', 'lifland',
  // labs
  'openai', 'deepmind', 'anthropic', 'meta', 'xai',
];
const esteemRank = (id: string) => {
  const i = ESTEEM_ORDER.indexOf(id);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
};
const byEsteem = (a: Preset, b: Preset) => esteemRank(a.id) - esteemRank(b.id);

const people = presets.filter((p) => p.category === 'person').sort(byEsteem);
const labs = presets.filter((p) => p.category === 'lab').sort(byEsteem);

function presetItem(p: Preset, ev: number) {
  return (
    <MenuItem key={p.id} value={p.id} sx={{ fontSize: '0.82rem' }}>
      <Box component="span" sx={{ flex: 1 }}>{displayName(p)}</Box>
      <Box
        component="span"
        title={`expected value ${fmtSigned(ev)}`}
        sx={{ fontFamily: fonts.mono, fontSize: '0.74rem', color: valueColor(ev), ml: 1.5 }}
      >
        {fmtSigned(ev)}
      </Box>
    </MenuItem>
  );
}

export function Presets() {
  const activePresetId = useBeliefs((s) => s.activePresetId);
  const applyPreset = useBeliefs((s) => s.applyPreset);
  const probabilityModel = useBeliefs((s) => s.probabilityModel);
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);

  const active = presets.find((p) => p.id === activePresetId);

  // EV + implied p(doom) per preset, under the ACTIVE model (recomputed on toggle).
  const { presetEv, presetDoom } = useMemo(() => {
    const ev: Record<string, number> = {};
    const doom: Record<string, number> = {};
    for (const p of presets) {
      const a = analyzePreset(p, probabilityModel);
      ev[p.id] = a.ev;
      doom[p.id] = doomMass(a.scenarios);
    }
    return { presetEv: ev, presetDoom: doom };
  }, [probabilityModel]);

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
      <Typography sx={{ fontFamily: fonts.display, fontSize: '0.82rem', color: c.bone, mb: 1 }}>
        Enter your own beliefs below — or start from a well-known figure or lab:
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
          {people.map((p) => presetItem(p, presetEv[p.id]))}
          <ListSubheader sx={{ ...sectionLabel, bgcolor: c.panel, lineHeight: '28px', color: c.faint }}>Labs</ListSubheader>
          {labs.map((p) => presetItem(p, presetEv[p.id]))}
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

          <Box sx={{ mb: 1 }}>
            {active.pdoom && (
              <Typography sx={{ fontSize: '0.72rem', color: c.mute }}>
                Stated risk:{' '}
                <Box component="span" sx={{ fontFamily: fonts.mono, color: c.bone }}>{active.pdoom}</Box>
              </Typography>
            )}
            <Typography sx={{ fontSize: '0.72rem', color: c.mute, display: 'inline-flex', alignItems: 'center' }}>
              Model-implied extinction mass:{' '}
              <Box component="span" sx={{ fontFamily: fonts.mono, color: valueColor(-presetDoom[active.id]), ml: 0.5 }}>
                {Math.round(presetDoom[active.id] * 100)}%
              </Box>
              <InfoTip>
                The probability this model puts on extinction-level outcomes (survival ≈ lost), given
                this entity's credences and the <em>shared</em> outcome model, under the{' '}
                <b>active probability model</b> ({probabilityModel === 'bayesNet' ? 'Bayes net' : 'independence + couplings'}) —
                so it equals the headline p(doom) once you load this preset. Toggle the probability model
                and this value tracks it. It can diverge from a <em>stated</em> p(doom) for two reasons:
                (1) a gestalt p(doom) often differs from the product of someone's per-factor credences
                (people aren't internally consistent), and (2) the outcome model is shared — it may value
                a scenario like "misaligned but controlled" more optimistically than a given pessimist
                would. Large gaps point at a credence worth re-checking, or a value judgment the shared
                model can't express.
              </InfoTip>
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} alignItems="center">
            <Link
              component="button"
              type="button"
              onClick={() => setShowSources(true)}
              sx={{ fontSize: '0.72rem', color: c.accent, textDecorationColor: c.accent }}
            >
              Sources & reasoning ↗
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

          <Dialog open={showSources} onClose={() => setShowSources(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontFamily: fonts.display, fontSize: '1rem', pb: 0.5 }}>
              {displayName(active)}
              <Typography sx={{ fontSize: '0.72rem', color: c.mute, fontWeight: 400 }}>{active.role}</Typography>
            </DialogTitle>
            <DialogContent>
              {active.reconciliation ? (
                <Box sx={{ mb: 1.75 }}>
                  <Typography sx={{ ...sectionLabel, fontSize: '0.64rem', mb: 0.5 }}>
                    How the numbers reconcile
                  </Typography>
                  <Typography sx={{ fontSize: '0.74rem', color: c.mute, mb: 0.6 }}>
                    Stated: <Box component="span" sx={{ fontFamily: fonts.mono, color: c.bone }}>{active.pdoom ?? 'no number on record'}</Box>
                    {' · '}model-implied extinction mass:{' '}
                    <Box component="span" sx={{ fontFamily: fonts.mono, color: valueColor(-presetDoom[active.id]) }}>
                      {Math.round(presetDoom[active.id] * 100)}%
                    </Box>
                  </Typography>
                  <Typography sx={{ fontSize: '0.76rem', color: c.bone, lineHeight: 1.55 }}>
                    {active.reconciliation}
                  </Typography>
                </Box>
              ) : null}
              <Typography sx={{ ...sectionLabel, fontSize: '0.64rem', mb: 0.75 }}>
                How each factor was set · per-factor accuracy
              </Typography>
              {[...dataset.factors, ...(dataset.subfactors ?? [])].map((f) => {
                const view = active.factors[f.id as KnownFactorId];
                if (!view) return null;
                return (
                  <Box key={f.id} sx={{ mb: 0.85 }}>
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.15 }}>
                      <Tooltip title={`${Math.round(view.accuracy * 100)}% — how directly the public record pins this factor`} arrow>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accuracyColor(view.accuracy), flexShrink: 0 }} />
                      </Tooltip>
                      <Typography sx={{ fontFamily: fonts.display, fontSize: '0.68rem', fontWeight: 600, color: c.bone }}>
                        {f.label}
                      </Typography>
                      <Typography sx={{ fontFamily: fonts.mono, fontSize: '0.62rem', color: c.faint }}>
                        {Math.round(view.accuracy * 100)}%
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: '0.68rem', color: c.mute, lineHeight: 1.4, pl: 1.75 }}>
                      {view.note}
                      {view.refs?.length ? (
                        <Box component="sup" sx={{ color: c.accent, fontFamily: fonts.mono, ml: 0.25 }}>
                          {view.refs.join(',')}
                        </Box>
                      ) : null}
                    </Typography>
                  </Box>
                );
              })}

              <Typography sx={{ ...sectionLabel, fontSize: '0.64rem', mt: 1.25, mb: 0.5 }}>References</Typography>
              {active.references.map((ref, i) => (
                <Box key={i} sx={{ mb: 0.85, display: 'flex', gap: 0.5 }}>
                  <Typography sx={{ fontFamily: fonts.mono, fontSize: '0.66rem', color: c.faint, flexShrink: 0 }}>{i + 1}.</Typography>
                  <Box>
                    <Link
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontSize: '0.7rem', color: c.bone, display: 'inline-flex', alignItems: 'center', gap: 0.4, textDecorationColor: c.faint }}
                    >
                      {ref.label}
                      <OpenInNewIcon sx={{ fontSize: 11, color: c.faint }} />
                    </Link>
                    {ref.quote && (
                      <Typography sx={{ fontSize: '0.68rem', color: c.mute, fontStyle: 'italic', borderLeft: `2px solid ${c.line}`, pl: 1, mt: 0.3, lineHeight: 1.4 }}>
                        {ref.quote}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </DialogContent>
          </Dialog>
        </Box>
      )}
    </Box>
  );
}
