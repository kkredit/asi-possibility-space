import {
  Box,
  Button,
  Divider,
  FormControl,
  MenuItem,
  Select,
  Slider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { dataset } from '@model/dataset';
import { evaluators } from '@engine/index';
import type { Factor, FactorKind } from '@model/types';
import { useBeliefs } from '@shell/store';
import { Presets } from '@shell/controls/Presets';
import { c, fonts, kindColor } from '@shell/theme';

const KIND_ORDER: FactorKind[] = ['objective', 'contingent', 'influenceable'];
const KIND_HEADING: Record<FactorKind, string> = {
  objective: 'Objective · true in any universe',
  contingent: 'Contingent · settled baseline of our world',
  influenceable: 'Influenceable · still open to our choices',
};
const KIND_HINT: Record<FactorKind, string> = {
  objective:
    'Could not be otherwise in any universe — a fact of nature or logic. You can’t change it, only discover which way it is, by research. High sensitivity ⇒ value of information.',
  contingent:
    'Could have been otherwise, but it’s already settled in our world by how things have played out. You can’t move it now, only find out which world you’re in. High sensitivity ⇒ situational awareness.',
  influenceable:
    'Could be otherwise, and the choices are still ahead of us — your actions move it. Differs from contingent only in timing: future movement, not settled baseline. High sensitivity ⇒ where to act.',
};

const monoPct = { fontFamily: fonts.mono, fontSize: '0.72rem' };

function FactorControl({ factor }: { factor: Factor }) {
  const credences = useBeliefs((s) => s.credences[factor.id]);
  const pin = useBeliefs((s) => s.pins[factor.id]);
  const setCredence = useBeliefs((s) => s.setCredence);
  const setPin = useBeliefs((s) => s.setPin);

  return (
    <Box sx={{ mb: 1.75 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Tooltip title={factor.description} arrow placement="top-start">
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 500, fontSize: '0.84rem', color: c.bone }}>
            {factor.label}
          </Typography>
        </Tooltip>
        <FormControl size="small" sx={{ minWidth: 88 }}>
          <Select
            value={pin ?? '__free'}
            variant="standard"
            disableUnderline
            onChange={(e) => setPin(factor.id, e.target.value === '__free' ? null : e.target.value)}
            sx={{ fontFamily: fonts.mono, fontSize: '0.68rem', color: pin ? c.teal : c.faint, '& .MuiSelect-icon': { color: c.faint } }}
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
          alignItems="center"
          spacing={1}
          sx={{ opacity: pin && pin !== st.id ? 0.35 : 1, transition: 'opacity 120ms' }}
        >
          <Typography sx={{ width: 92, fontSize: '0.72rem', color: c.mute }}>{st.label}</Typography>
          <Slider
            size="small"
            min={0}
            max={1}
            step={0.01}
            value={credences[st.id]}
            onChange={(_, v) => setCredence(factor.id, st.id, v as number)}
            sx={{ flex: 1 }}
            disabled={!!pin}
          />
          <Typography sx={{ ...monoPct, width: 34, textAlign: 'right', color: c.bone }}>
            {Math.round(credences[st.id] * 100)}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}

export function Controls() {
  const weights = useBeliefs((s) => s.weights);
  const setWeight = useBeliefs((s) => s.setWeight);
  const evaluatorId = useBeliefs((s) => s.evaluatorId);
  const setEvaluator = useBeliefs((s) => s.setEvaluator);
  const reset = useBeliefs((s) => s.reset);

  return (
    <Stack spacing={2.25}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="overline" sx={{ color: c.mute }}>
          Beliefs
        </Typography>
        <Button size="small" startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />} onClick={reset} sx={{ color: c.mute, minWidth: 0 }}>
          Reset
        </Button>
      </Stack>

      <Presets />

      <Divider />

      <Box>
        <Typography sx={{ ...monoPct, color: c.faint, mb: 0.75, letterSpacing: '0.04em' }}>EVALUATOR</Typography>
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

      {KIND_ORDER.map((kind) => {
        const factors = dataset.factors.filter((f) => f.kind === kind);
        if (factors.length === 0) return null;
        return (
          <Box key={kind}>
            <Tooltip title={KIND_HINT[kind]} arrow placement="top-start">
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: kindColor[kind], flexShrink: 0 }} />
                <Typography sx={{ fontFamily: fonts.display, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.mute }}>
                  {KIND_HEADING[kind]}
                </Typography>
              </Stack>
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
          <Stack key={dim.id} direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Tooltip title={`${dim.lowLabel} (−1) … ${dim.highLabel} (+1)`} arrow>
              <Typography sx={{ width: 92, fontSize: '0.72rem', color: c.mute }}>{dim.label}</Typography>
            </Tooltip>
            <Slider size="small" min={0} max={1} step={0.01} value={weights[dim.id]} onChange={(_, v) => setWeight(dim.id, v as number)} sx={{ flex: 1 }} />
            <Typography sx={{ ...monoPct, width: 34, textAlign: 'right', color: c.bone }}>{weights[dim.id].toFixed(2)}</Typography>
          </Stack>
        ))}
      </Box>
    </Stack>
  );
}
