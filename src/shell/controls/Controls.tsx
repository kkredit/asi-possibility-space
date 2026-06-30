import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  MenuItem,
  Select,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { dataset } from '@model/dataset';
import { evaluators } from '@engine/index';
import type { Factor, FactorKind } from '@model/types';
import { useBeliefs } from '@shell/store';
import { kindColor } from '@shell/theme';

const KIND_ORDER: FactorKind[] = ['objective', 'contingent', 'influenceable'];
const KIND_HEADING: Record<FactorKind, string> = {
  objective: 'Objective — facts about reality (credence only)',
  contingent: 'Contingent — facts about our situation',
  influenceable: 'Influenceable — actions attach here',
};

function FactorControl({ factor }: { factor: Factor }) {
  const credences = useBeliefs((s) => s.credences[factor.id]);
  const pin = useBeliefs((s) => s.pins[factor.id]);
  const setCredence = useBeliefs((s) => s.setCredence);
  const setPin = useBeliefs((s) => s.setPin);

  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Tooltip title={factor.description} arrow placement="top-start">
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {factor.label}
          </Typography>
        </Tooltip>
        <FormControl size="small" sx={{ minWidth: 96 }}>
          <Select
            value={pin ?? '__free'}
            variant="standard"
            onChange={(e) => setPin(factor.id, e.target.value === '__free' ? null : e.target.value)}
            sx={{ fontSize: 12 }}
          >
            <MenuItem value="__free" sx={{ fontSize: 12 }}>
              <em>free</em>
            </MenuItem>
            {factor.states.map((st) => (
              <MenuItem key={st.id} value={st.id} sx={{ fontSize: 12 }}>
                pin: {st.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      {factor.states.map((st) => (
        <Stack key={st.id} direction="row" alignItems="center" spacing={1} sx={{ opacity: pin && pin !== st.id ? 0.4 : 1 }}>
          <Typography variant="caption" sx={{ width: 96, color: 'text.secondary' }}>
            {st.label}
          </Typography>
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
          <Typography variant="caption" sx={{ width: 36, textAlign: 'right' }}>
            {(credences[st.id] * 100).toFixed(0)}%
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
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Beliefs</Typography>
        <Button size="small" startIcon={<RestartAltIcon />} onClick={reset}>
          Reset
        </Button>
      </Stack>

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Evaluator
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={evaluatorId}
          onChange={(_, v) => v && setEvaluator(v)}
          fullWidth
        >
          {evaluators.map((e) => (
            <ToggleButton key={e.id} value={e.id} sx={{ textTransform: 'none' }}>
              <Tooltip title={e.description} arrow>
                <span>{e.label}</span>
              </Tooltip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Divider />

      {KIND_ORDER.map((kind) => (
        <Box key={kind}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: kindColor[kind] }} />
            <Typography variant="overline" sx={{ lineHeight: 1.2 }}>
              {KIND_HEADING[kind]}
            </Typography>
          </Stack>
          {dataset.factors
            .filter((f) => f.kind === kind)
            .map((f) => (
              <FactorControl key={f.id} factor={f} />
            ))}
        </Box>
      ))}

      <Divider />

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Value weights
        </Typography>
        {dataset.valueDimensions.map((dim) => (
          <Stack key={dim.id} direction="row" alignItems="center" spacing={1}>
            <Tooltip title={`${dim.lowLabel} (−1) … ${dim.highLabel} (+1)`} arrow>
              <Typography variant="caption" sx={{ width: 96, color: 'text.secondary' }}>
                {dim.label}
              </Typography>
            </Tooltip>
            <Slider
              size="small"
              min={0}
              max={1}
              step={0.01}
              value={weights[dim.id]}
              onChange={(_, v) => setWeight(dim.id, v as number)}
              sx={{ flex: 1 }}
            />
            <Chip size="small" label={weights[dim.id].toFixed(2)} sx={{ width: 52 }} />
          </Stack>
        ))}
      </Box>
    </Stack>
  );
}
