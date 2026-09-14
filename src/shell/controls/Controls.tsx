import { useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Link,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LinkIcon from '@mui/icons-material/Link';
import { dataset } from '@model/dataset';
import { evaluators } from '@engine/index';
import { FACTOR_KINDS, type Factor, type FactorKind, type Subfactor } from '@model/types';
import { setHashParam, useBeliefs } from '@shell/store';
import { encodeBeliefs } from '@shell/urlBeliefs';
import { BayesNetDiagram } from '@viz/BayesNetDiagram';
import { FactorBackground } from '@viz/FactorBackground';
import { c, fonts, kindColor } from '@shell/theme';
import { DEV_TOOLS } from '@shell/devTools';

const KIND_HEADING: Record<FactorKind, string> = {
  objective: 'Objective',
  contingent: 'Contingent',
  influenceable: 'Influenceable',
};
// One-line hint under each kind heading: what the sliders in that group mean.
const KIND_SUBHEAD: Record<FactorKind, string> = {
  objective: 'your estimate that each timeless fact holds',
  contingent: 'your estimate of the world at ASI onset (low leverage)',
  influenceable: 'your estimate of the world at ASI onset (high leverage)',
};
const KIND_HINT: Record<FactorKind, string> = {
  objective:
    'A structural fact true the same way in any universe. The slider is your confidence it holds. You can’t change it, only research it. High sensitivity ⇒ value of information.',
  contingent:
    'A feature of the world at ASI onset that we have little leverage over: its trajectory is set mostly by exogenous forces. The slider forecasts its state at the threshold; you mainly track it and position for it. High sensitivity ⇒ situational awareness.',
  influenceable:
    'A feature of the world at ASI onset our choices substantially move. The slider forecasts its state at the threshold. Same kind of thing as contingent, just more leverage. High sensitivity ⇒ where to act.',
};

const monoPct = { fontFamily: fonts.mono, fontSize: '0.72rem' };

function FactorControl({ factor }: { factor: Factor }) {
  const dist = useBeliefs((s) => s.credences[factor.id]);
  const pin = useBeliefs((s) => s.pins[factor.id]);
  const setCredence = useBeliefs((s) => s.setCredence);
  const setPin = useBeliefs((s) => s.setPin);
  const alignmentMode = useBeliefs((s) => s.alignmentMode);
  const onSlide = setCredence;
  const [learnOpen, setLearnOpen] = useState(false);
  // A parent owned by the deep dive: its sliders become derived read-outs.
  const derivedLock =
    alignmentMode === 'derived' && (dataset.derivations ?? []).some((d) => d.factor === factor.id);

  return (
    <Box sx={{ mb: 1.75 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          justifyContent: "space-between"
        }}>
        <Tooltip
          arrow
          placement="top-start"
          leaveDelay={120}
          title={
            <>
              {factor.description}
              {factor.background ? (
                <Box sx={{ mt: 0.75 }}>
                  <Link
                    component="button"
                    type="button"
                    onClick={() => setLearnOpen(true)}
                    sx={{ fontSize: '0.72rem', color: c.accent, textDecorationColor: c.accent }}
                  >
                    Read more: the debate &amp; key reading →
                  </Link>
                </Box>
              ) : null}
            </>
          }
        >
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 500, fontSize: '0.84rem', color: c.bone, cursor: 'help', minWidth: 0 }}>
            {factor.label}
          </Typography>
        </Tooltip>
        {factor.background ? (
          <Dialog open={learnOpen} onClose={() => setLearnOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontFamily: fonts.display, fontSize: '1rem', pb: 0.5 }}>
              {factor.label}
              <Typography sx={{ fontSize: '0.66rem', color: kindColor[factor.kind], fontWeight: 400, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {factor.kind}
              </Typography>
            </DialogTitle>
            <DialogContent>
              <FactorBackground factor={factor} />
            </DialogContent>
          </Dialog>
        ) : null}
        <FormControl size="small" sx={{ minWidth: 88 }}>
          <Select
            value={pin ?? '__free'}
            variant="standard"
            disableUnderline
            onChange={(e) => setPin(factor.id, e.target.value === '__free' ? null : e.target.value)}
            sx={{ fontFamily: fonts.mono, fontSize: '0.68rem', color: pin ? c.accent : c.faint, '& .MuiSelect-icon': { color: c.faint } }}
          >
            <MenuItem value="__free" sx={{ fontSize: '0.72rem' }}>free</MenuItem>
            {factor.states.map((st) => (
              <MenuItem key={st.id} value={st.id} sx={{ fontSize: '0.72rem' }}>
                pin · {st.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      {factor.states.map((st) => (
        <Stack
          key={st.id}
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            opacity: pin && pin !== st.id ? 0.35 : 1,
            transition: 'opacity 120ms'
          }}>
          <Typography sx={{ width: 92, fontSize: '0.72rem', color: c.mute }}>{st.label}</Typography>
          <Slider
            size="small"
            min={0}
            max={1}
            step={0.01}
            value={dist[st.id] ?? 0}
            onChange={(_, v) => onSlide(factor.id, st.id, v as number)}
            sx={{ flex: 1 }}
            disabled={!!pin || derivedLock}
          />
          <Typography sx={{ ...monoPct, width: 34, textAlign: 'right', color: c.bone }}>
            {Math.round((dist[st.id] ?? 0) * 100)}
          </Typography>
        </Stack>
      ))}
      <DeepDive factor={factor} />
    </Box>
  );
}


/** One deep-dive subfactor: like a factor row, minus pins, plus its gate hint. */
function SubfactorControl({ sub }: { sub: Subfactor }) {
  const dist = useBeliefs((s) => s.subCredences[sub.id]);
  const active = useBeliefs((s) => s.alignmentMode === 'derived');
  const setSubCredence = useBeliefs((s) => s.setSubCredence);
  const [learnOpen, setLearnOpen] = useState(false);
  const gateLabel = sub.gatedBy
    ? dataset.subfactors?.find((x) => x.id === sub.gatedBy)?.label ??
      dataset.factors.find((f) => f.id === sub.gatedBy)?.label
    : undefined;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={0.75} sx={{
        alignItems: "baseline"
      }}>
        <Tooltip
          arrow
          placement="top-start"
          leaveDelay={120}
          title={
            <>
              {sub.description}
              {sub.background ? (
                <Box sx={{ mt: 0.75 }}>
                  <Link
                    component="button"
                    type="button"
                    onClick={() => setLearnOpen(true)}
                    sx={{ fontSize: '0.72rem', color: c.accent, textDecorationColor: c.accent }}
                  >
                    Read more: the debate &amp; key reading →
                  </Link>
                </Box>
              ) : null}
            </>
          }
        >
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 500, fontSize: '0.78rem', color: c.bone, cursor: 'help', minWidth: 0 }}>
            {sub.label}
          </Typography>
        </Tooltip>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: kindColor[sub.kind], flexShrink: 0, alignSelf: 'center' }} />
      </Stack>
      {gateLabel ? (
        <Typography sx={{ fontSize: '0.64rem', color: c.faint, mb: 0.25 }}>payoff gated by “{gateLabel}”</Typography>
      ) : null}
      {sub.background ? (
        <Dialog open={learnOpen} onClose={() => setLearnOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontFamily: fonts.display, fontSize: '1rem', pb: 0.5 }}>
            {sub.label}
            <Typography sx={{ fontSize: '0.66rem', color: kindColor[sub.kind], fontWeight: 400, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {sub.kind} · alignment deep dive
            </Typography>
          </DialogTitle>
          <DialogContent>
            <FactorBackground factor={sub} />
          </DialogContent>
        </Dialog>
      ) : null}
      {sub.states.map((st) => (
        <Stack key={st.id} direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <Tooltip title={st.blurb ?? ''} arrow placement="left">
            <Typography sx={{ width: 84, fontSize: '0.7rem', color: c.mute }}>{st.label}</Typography>
          </Tooltip>
          <Slider
            size="small"
            min={0}
            max={1}
            step={0.01}
            value={dist?.[st.id] ?? 0}
            onChange={(_, v) => setSubCredence(sub.id, st.id, v as number)}
            sx={{ flex: 1 }}
            disabled={!active}
          />
          <Typography sx={{ ...monoPct, width: 34, textAlign: 'right', color: c.bone }}>
            {Math.round((dist?.[st.id] ?? 0) * 100)}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}

/** The collapsible deep-dive cluster under a derived parent factor. */
function DeepDive({ factor }: { factor: Factor }) {
  const subs = (dataset.subfactors ?? []).filter((sf) => sf.parent === factor.id);
  const alignmentMode = useBeliefs((s) => s.alignmentMode);
  const setAlignmentMode = useBeliefs((s) => s.setAlignmentMode);
  const [open, setOpen] = useState(false);
  if (subs.length === 0) return null;
  const derived = alignmentMode === 'derived';

  return (
    <Box sx={{ mt: 0.25, mb: 0.75, ml: 0.5, pl: 1.25, borderLeft: `2px solid ${c.line}` }}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between"
        }}>
        <Typography
          onClick={() => setOpen(!open)}
          sx={{ fontFamily: fonts.display, fontSize: '0.72rem', color: derived ? c.accent : c.mute, cursor: 'pointer', userSelect: 'none', '&:hover': { color: c.accent } }}
        >
          {open ? '▾' : '▸'} Deep dive · {subs.length} subfactors{derived ? ' · driving this factor' : ' · detached'}
        </Typography>
        {open ? (
          <FormControlLabel
            sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: '0.66rem', color: c.mute } }}
            control={<Switch size="small" checked={derived} onChange={(_, on) => setAlignmentMode(on ? 'derived' : 'direct')} />}
            label="derive"
            labelPlacement="start"
          />
        ) : null}
      </Stack>
      <Collapse in={open}>
        <Box sx={{ mt: 1 }}>
          {derived ? null : (
            <Typography sx={{ fontSize: '0.66rem', color: c.faint, mb: 0.75 }}>
              Detached: the parent slider is set directly; these sub-beliefs are inert until you re-enable “derive”.
            </Typography>
          )}
          {subs.map((sf) => (
            <SubfactorControl key={sf.id} sub={sf} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

export function Controls() {
  const weights = useBeliefs((s) => s.weights);
  const setWeight = useBeliefs((s) => s.setWeight);
  const evaluatorId = useBeliefs((s) => s.evaluatorId);
  const setEvaluator = useBeliefs((s) => s.setEvaluator);
  const probabilityModel = useBeliefs((s) => s.probabilityModel);
  const setProbabilityModel = useBeliefs((s) => s.setProbabilityModel);
  const reset = useBeliefs((s) => s.reset);
  const [netOpen, setNetOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Share the CURRENT beliefs: an active preset shares as `#preset=<id>`; anything
  // custom is encoded whole into a compact `#beliefs=<base64url>` param.
  const copyLink = async () => {
    if (typeof window === 'undefined' || !navigator.clipboard) return;
    const s = useBeliefs.getState();
    if (s.activePresetId) {
      setHashParam('beliefs', null);
      setHashParam('preset', s.activePresetId);
    } else {
      setHashParam('preset', null);
      setHashParam(
        'beliefs',
        encodeBeliefs({
          credences: s.credences,
          subCredences: s.subCredences,
          weights: s.weights,
          probabilityModel: s.probabilityModel,
          alignmentMode: s.alignmentMode,
        }),
      );
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Stack spacing={2.25}>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center"
        }}>
        <Typography sx={{ fontFamily: fonts.display, fontWeight: 700, fontSize: '1.05rem', letterSpacing: '0.01em', color: c.bone }}>
          Beliefs
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            startIcon={<LinkIcon sx={{ fontSize: 16 }} />}
            onClick={copyLink}
            sx={{ color: copied ? c.accent : c.mute, minWidth: 0 }}
          >
            {copied ? 'Copied ✓' : 'Copy link'}
          </Button>
          <Button size="small" startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />} onClick={reset} sx={{ color: c.mute, minWidth: 0 }}>
            Reset
          </Button>
        </Stack>
      </Stack>

      {dataset.bayesNet ? (
        <Dialog open={netOpen} onClose={() => setNetOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontFamily: fonts.display, fontSize: '1rem' }}>
            The relationship network
          </DialogTitle>
          <DialogContent>
            <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 1.5 }}>
              {dataset.bayesNet.description} Arrows point from a cause to what it shapes; roots take
              their prior from your sliders, children from conditional tables. Hover a node for its rationale.
            </Typography>
            <BayesNetDiagram net={dataset.bayesNet} factors={dataset.factors} />
          </DialogContent>
        </Dialog>
      ) : null}

      {FACTOR_KINDS.map((kind) => {
        const factors = dataset.factors.filter((f) => f.kind === kind);
        if (factors.length === 0) return null;
        return (
          <Box key={kind}>
            <Tooltip title={KIND_HINT[kind]} arrow placement="top-start">
              <Box sx={{ mb: 1.25, cursor: 'help' }}>
                <Stack direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: kindColor[kind], flexShrink: 0 }} />
                  <Typography sx={{ fontFamily: fonts.display, fontSize: '0.92rem', fontWeight: 700, color: c.bone }}>
                    {KIND_HEADING[kind]}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: '0.7rem', color: c.mute, lineHeight: 1.4, mt: 0.25, ml: 2 }}>
                  {KIND_SUBHEAD[kind]}
                </Typography>
              </Box>
            </Tooltip>
            {factors.map((f) => (
              <FactorControl key={f.id} factor={f} />
            ))}
          </Box>
        );
      })}

      <Divider />

      <Box>
        <Typography sx={{ fontFamily: fonts.display, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.mute, mb: 1.25 }}>
          Value weights
        </Typography>
        {dataset.valueDimensions.map((dim) => (
          <Stack
            key={dim.id}
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              mb: 0.5
            }}>
            <Tooltip title={`${dim.lowLabel} (−1) … ${dim.highLabel} (+1)`} arrow>
              <Typography sx={{ width: 92, fontSize: '0.72rem', color: c.mute }}>{dim.label}</Typography>
            </Tooltip>
            <Slider size="small" min={0} max={1} step={0.01} value={weights[dim.id]} onChange={(_, v) => setWeight(dim.id, v as number)} sx={{ flex: 1 }} />
            <Typography sx={{ ...monoPct, width: 34, textAlign: 'right', color: c.bone }}>{weights[dim.id].toFixed(2)}</Typography>
          </Stack>
        ))}
      </Box>

      {DEV_TOOLS && (
        <>
          <Divider />

          {/* Advanced: the value model + probability model. Collapsed by default — these
              are analysis-methodology knobs most users never need to touch, and the whole
              section is dev-only (see @shell/devTools) since it exposes evaluators besides
              the hand-reasoned cached one. */}
          <Box>
            <Typography
              onClick={() => setAdvancedOpen((o) => !o)}
              sx={{ fontFamily: fonts.display, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: c.mute, cursor: 'pointer', userSelect: 'none', '&:hover': { color: c.accent } }}
            >
              {advancedOpen ? '▾' : '▸'} Advanced · model settings
            </Typography>
            <Collapse in={advancedOpen}>
              <Stack spacing={2.25} sx={{ mt: 1.5 }}>
                <Box>
                  <Typography sx={{ ...monoPct, color: c.faint, mb: 0.75, letterSpacing: '0.04em' }}>VALUE MODEL (EVALUATOR)</Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={evaluatorId}
                      onChange={(e) => setEvaluator(e.target.value)}
                      sx={{ fontFamily: fonts.display, fontSize: '0.82rem' }}
                      MenuProps={{ slotProps: { paper: { sx: { maxWidth: 340 } } } }}
                    >
                      {evaluators.map((e) => (
                        <MenuItem key={e.id} value={e.id} sx={{ display: 'block', py: 0.9 }}>
                          <Typography sx={{ fontFamily: fonts.display, fontSize: '0.82rem', color: c.bone }}>
                            {e.label}
                          </Typography>
                          <Typography sx={{ fontSize: '0.7rem', color: c.mute, whiteSpace: 'normal', lineHeight: 1.35 }}>
                            {e.description}
                          </Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box>
                  <Typography sx={{ ...monoPct, color: c.faint, mb: 0.75, letterSpacing: '0.04em' }}>PROBABILITY MODEL</Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={probabilityModel}
                      onChange={(e) => setProbabilityModel(e.target.value as 'independence' | 'bayesNet')}
                      sx={{ fontFamily: fonts.display, fontSize: '0.82rem' }}
                      MenuProps={{ slotProps: { paper: { sx: { maxWidth: 340 } } } }}
                    >
                      <MenuItem value="independence" sx={{ display: 'block', py: 0.9 }}>
                        <Typography sx={{ fontFamily: fonts.display, fontSize: '0.82rem', color: c.bone }}>Independence + couplings</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: c.mute, whiteSpace: 'normal', lineHeight: 1.35 }}>
                          Factors independent, with a few hand-set dependency corrections. Each slider is a free marginal.
                        </Typography>
                      </MenuItem>
                      <MenuItem value="bayesNet" sx={{ display: 'block', py: 0.9 }}>
                        <Typography sx={{ fontFamily: fonts.display, fontSize: '0.82rem', color: c.bone }}>Bayes net (soft evidence)</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: c.mute, whiteSpace: 'normal', lineHeight: 1.35 }}>
                          A DAG of relationships. Slide any factor and the untouched ones re-rake to stay consistent.
                        </Typography>
                      </MenuItem>
                    </Select>
                  </FormControl>
                  {dataset.bayesNet ? (
                    <Box
                      component="span"
                      onClick={() => setNetOpen(true)}
                      sx={{ display: 'inline-block', mt: 0.6, cursor: 'pointer', color: c.mute, fontFamily: fonts.display, fontSize: '0.74rem', '&:hover': { color: c.accent } }}
                    >
                      View the network ↗
                    </Box>
                  ) : null}
                </Box>
              </Stack>
            </Collapse>
          </Box>
        </>
      )}
    </Stack>
  );
}
