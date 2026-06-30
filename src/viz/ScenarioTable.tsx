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
  Tooltip,
  Typography,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import type { Factor } from '@model/types';
import type { EvaluatedScenario } from '@engine/analyze';
import { valueColor } from '@shell/theme';

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
      {label}
    </TableSortLabel>
  );

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Scenarios ({shown.length} of {scenarios.length} shown)
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 640 }}>
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
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{(s.probability * 100).toFixed(2)}%</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={s.scalar.toFixed(2)}
                    sx={{ bgcolor: valueColor(s.scalar), color: '#0d1117', fontWeight: 600, minWidth: 52 }}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: s.reasoned ? 0.5 : 0 }}>
                    {factors.map((f) => (
                      <Chip
                        key={f.id}
                        size="small"
                        variant="outlined"
                        label={stateLabel(f, s.scenario[f.id])}
                        sx={{ height: 20, fontSize: 10 }}
                      />
                    ))}
                  </Stack>
                  {s.reasoned ? (
                    <Stack direction="row" spacing={0.5} alignItems="flex-start">
                      <StarIcon sx={{ fontSize: 13, color: '#d29922', mt: '2px' }} />
                      <Typography variant="caption" color="text.secondary">
                        {s.narrative}
                      </Typography>
                    </Stack>
                  ) : (
                    <Tooltip title="Not yet hand-reasoned — value is the linear fallback" arrow>
                      <Typography variant="caption" sx={{ color: '#6e7681', fontStyle: 'italic' }}>
                        linear fallback
                      </Typography>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
