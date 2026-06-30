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
  objective: 'Objective · timeless structural fact',
  contingent: 'Contingent · the world at ASI · low leverage',
  influenceable: 'Influenceable · the world at ASI · high leverage',
};
const KIND_HINT: Record<FactorKind, string> = {
  objective:
    'A structural fact true the same way in any universe. The slider is your confidence it holds. You can’t change it, only research it. High sensitivity ⇒ value of information.',
  contingent:
    'A feature of the world at ASI onset that we have little leverage over — its trajectory is set mostly by exogenous forces. The slider forecasts its state at the threshold; you mainly track it and position for it. High sensitivity ⇒ situational awareness.',
  influenceable:
    'A feature of the world at ASI onset our choices substantially move. The slider forecasts its state at the threshold. Same kind of thing as contingent — just more leverage. High sensitivity ⇒ where to act.',
};

const monoPct = { fontFamily: fonts.mono, fontSize: '0.72rem' };

function FactorControl({ factor }: { factor: Factor }) {
  const netMode = useBeliefs((s) => s.probabilityModel === 'bayesNet');
  const credences = useBeliefs((s) => s.credences[factor.id]);
  const bayesMarginals = useBeliefs((s) => s.bayesMarginals[factor.id]);
  const touched = useBeliefs((s) => netMode && !!s.targets[factor.id]);
  const pin = useBeliefs((s) => s.pins[factor.id]);
  const setCredence = useBeliefs((s) => s.setCredence);
  const setMarginalTarget = useBeliefs((s) => s.setMarginalTarget);
  const setPin = useBeliefs((s) => s.setPin);

  // In Bayes-net mode a slider shows the reconciled marginal and edits it as soft
  // evidence (re-raking the joint); in independence mode it edits the credence directly.
  const dist = (netMode ? bayesMarginals : credences) ?? credences;
  const onSlide = netMode ? setMarginalTarget : setCredence;

  return (
    <Box sx={{ mb: 1.75 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Tooltip title={factor.description} arrow placement="top-start">
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography sx={{ fontFamily: fonts.display, fontWeight: 500, fontSize: '0.84rem', color: c.bone }}>
              {factor.label}
            </Typography>
            {netMode ? (
              <Typography sx={{ fontFamily: fonts.mono, fontSize: '0.6rem', color: touched ? c.teal : c.faint, letterSpacing: '0.04em' }}>
                {touched ? 'HELD' : 'FLOAT'}
              </Typography>
            ) : null}
          </Stack>
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
            value={dist[st.id] ?? 0}
            onChange={(_, v) => onSlide(factor.id, st.id, v as number)}
            sx={{ flex: 1 }}
            disabled={!!pin}
          />
          <Typography sx={{ ...monoPct, width: 34, textAlign: 'right', color: netMode && touched ? c.teal : c.bone }}>
            {Math.round((dist[st.id] ?? 0) * 100)}
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
  const probabilityModel = useBeliefs((s) => s.probabilityModel);
  const setProbabilityModel = useBeliefs((s) => s.setProbabilityModel);
  const reset = useBeliefs((s) => s.reset);
  const netMode = probabilityModel === 'bayesNet';

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
      </Box>

      <Box>
        <Typography sx={{ ...monoPct, color: c.faint, mb: 0.4, letterSpacing: '0.04em' }}>PROBABILITIES</Typography>
        <Typography variant="caption" sx={{ color: c.mute, display: 'block', lineHeight: 1.4 }}>
          {netMode ? (
            <>
              Each slider is the chance of a state <b>at ASI onset</b>. Drag one and it’s held (
              <Box component="span" sx={{ color: c.teal, fontFamily: fonts.mono, fontSize: '0.9em' }}>HELD</Box>) as soft
              evidence; the <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: '0.9em' }}>FLOAT</Box> factors
              re-rake to stay consistent with the net. Reset releases everything.
            </>
          ) : (
            <>
              For each factor, the chance of each state <b>at ASI onset</b> (the threshold where value
              locks in). Objective factors are the exception — there the slider is your current confidence
              a timeless property holds.
            </>
          )}
        </Typography>
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
