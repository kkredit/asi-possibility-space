import { useState } from 'react';
import {
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import type { Factor } from '@model/types';
import type { EvaluatedScenario } from '@engine/analyze';
import { c, fonts, valueColor } from '@shell/theme';

type SortKey = 'probability' | 'scalar' | 'contribution';

interface Props {
  scenarios: EvaluatedScenario[];
  factors: Factor[];
  limit?: number;
}

function stateLabel(factor: Factor, stateId: string): string {
  return factor.states.find((s) => s.id === stateId)?.label ?? stateId;
}

/** Sortable, truncated table of the most relevant scenarios. */
export function ScenarioTable({ scenarios, factors, limit = 25 }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('probability');

  const sorted = [...scenarios].sort((a, b) => {
    if (sortKey === 'probability') return b.probability - a.probability;
    if (sortKey === 'scalar') return a.scalar - b.scalar; // worst first
    return Math.abs(b.probability * b.scalar) - Math.abs(a.probability * a.scalar);
  });
  const shown = sorted.slice(0, limit);

  const header = (key: SortKey, label: string) => (
    <TableSortLabel active={sortKey === key} direction={key === 'scalar' ? 'asc' : 'desc'} onClick={() => setSortKey(key)}>
      <Box component="span" sx={{ fontFamily: fonts.display, fontSize: '0.78rem', letterSpacing: '0.03em' }}>{label}</Box>
    </TableSortLabel>
  );

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Scenarios
      </Typography>
      <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 1 }}>
        top {shown.length} of {scenarios.length} — sort by probability, value, or contribution to EV
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 640, '& td, & th': { borderColor: c.line } }}>
          <TableHead>
            <TableRow>
              <TableCell>{header('probability', 'P')}</TableCell>
              <TableCell>{header('scalar', 'Value')}</TableCell>
              <TableCell>{header('contribution', 'States & outcome')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((s, i) => (
              <TableRow key={i} hover>
                <TableCell sx={{ whiteSpace: 'nowrap', fontFamily: fonts.mono, fontSize: '0.78rem', color: c.mute, verticalAlign: 'top' }}>
                  {(s.probability * 100).toFixed(2)}%
                </TableCell>
                <TableCell sx={{ verticalAlign: 'top' }}>
                  <Box
                    sx={{
                      display: 'inline-block',
                      fontFamily: fonts.mono,
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      color: c.ink,
                      bgcolor: valueColor(s.scalar),
                      borderRadius: 1,
                      px: 0.75,
                      py: 0.25,
                      minWidth: 46,
                      textAlign: 'center',
                    }}
                  >
                    {s.scalar >= 0 ? '+' : '−'}{Math.abs(s.scalar).toFixed(2)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.6 }}>
                    {factors.map((f) => (
                      <Chip
                        key={f.id}
                        size="small"
                        variant="outlined"
                        label={stateLabel(f, s.scenario[f.id])}
                        sx={{ height: 19, fontSize: 10, fontFamily: fonts.body, color: c.mute, '& .MuiChip-label': { px: 0.75 } }}
                      />
                    ))}
                  </Stack>
                  <Typography variant="caption" sx={{ color: c.mute, lineHeight: 1.45 }}>
                    {s.narrative}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
