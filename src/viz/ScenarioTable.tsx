import { useState } from 'react';
import {
  alpha,
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
import { fmtSigned } from '@viz/text';
import { c, fonts, valueColor } from '@shell/theme';

type SortKey = 'probability' | 'scalar' | 'contribution';
type SortDir = 'asc' | 'desc';

interface Props {
  scenarios: EvaluatedScenario[];
  factors: Factor[];
  limit?: number;
  /** Tint predicate — true for cells a published thread maps to (ScenarioThreads). */
  isHighlighted?: (s: EvaluatedScenario) => boolean;
}

function stateLabel(factor: Factor, stateId: string): string {
  return factor.states.find((s) => s.id === stateId)?.label ?? stateId;
}

/** The metric each column sorts on, and the direction it opens with when first picked. */
const metricOf: Record<SortKey, (s: EvaluatedScenario) => number> = {
  probability: (s) => s.probability,
  scalar: (s) => s.scalar,
  contribution: (s) => Math.abs(s.probability * s.scalar),
};
const DEFAULT_DIR: Record<SortKey, SortDir> = { probability: 'desc', scalar: 'asc', contribution: 'desc' };

/** Sortable, truncated table of the most relevant scenarios. */
export function ScenarioTable({ scenarios, factors, limit = 25, isHighlighted }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('probability');
  const [sortDir, setSortDir] = useState<SortDir>(DEFAULT_DIR.probability);

  // Click a new column → sort by its natural default direction; click the active
  // column again → reverse it.
  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(DEFAULT_DIR[key]);
    }
  };

  const metric = metricOf[sortKey];
  const sorted = [...scenarios].sort((a, b) => (sortDir === 'asc' ? metric(a) - metric(b) : metric(b) - metric(a)));
  const shown = sorted.slice(0, limit);

  const header = (key: SortKey, label: string) => (
    <TableSortLabel active={sortKey === key} direction={sortKey === key ? sortDir : DEFAULT_DIR[key]} onClick={() => handleSort(key)}>
      <Box component="span" sx={{ fontFamily: fonts.display, fontSize: '0.78rem', letterSpacing: '0.03em' }}>{label}</Box>
    </TableSortLabel>
  );

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        Scenarios
      </Typography>
      <Typography variant="caption" sx={{ color: c.mute, display: 'block', mb: 1 }}>
        top {shown.length} of {scenarios.length}. Click a column to sort by probability, value, or contribution to EV; click again to reverse
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
            {shown.map((s) => {
              const highlighted = isHighlighted?.(s) ?? false;
              return (
                <TableRow
                  key={factors.map((f) => s.scenario[f.id]).join('|')}
                  hover
                  sx={highlighted ? { bgcolor: alpha(c.accent, 0.1), '& td:first-of-type': { borderLeft: `2px solid ${c.accent}` } } : undefined}
                >
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
                      {fmtSigned(s.scalar)}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      useFlexGap
                      sx={{
                        flexWrap: "wrap",
                        mb: 0.6
                      }}>
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
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}
