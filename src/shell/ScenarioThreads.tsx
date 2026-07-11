import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { dataset } from '@model/dataset';
import { presets } from '@model/presets';
import type { Scenario } from '@model/types';
import { scenarioKey, type EvaluatedScenario } from '@engine/index';
import { useBeliefs } from '@shell/store';
import { fmtSigned } from '@viz/text';
import { c, fonts, valueColor } from '@shell/theme';

/** Keys of every scenario a thread maps to — for tinting the rows below. */
export function threadHighlightKeys(): Set<string> {
  const keys = new Set<string>();
  for (const th of dataset.scenarioThreads ?? []) for (const sc of th.scenarios) keys.add(scenarioKey(sc));
  return keys;
}

/** One outcome word for a mapped cell, from its value bands (mirrors the headline). */
function outcomeTag(v: { survival: number; agency: number; flourishing: number }): string {
  if (v.survival < -0.5) return 'extinction';
  if (v.survival < 0.5 && v.agency < -0.6) return 'disempowered';
  if (v.survival >= 0.5 && v.flourishing >= 0.5) return 'flourishing';
  return 'mixed';
}

interface Props {
  scenarios: EvaluatedScenario[];
}

/**
 * Highlights published scenario threads (e.g. the AI Futures Project's AI-2040
 * plans) at the top of the Scenarios tab: each mapped to model cells, showing the
 * value and probability those cells take under the current beliefs, with a link to
 * the source. Grouped by entity; the entity name loads that belief preset.
 */
export function ScenarioThreads({ scenarios }: Props) {
  const applyPreset = useBeliefs((s) => s.applyPreset);
  const threads = dataset.scenarioThreads ?? [];
  if (threads.length === 0) return null;

  const byKey = new Map(scenarios.map((s) => [scenarioKey(s.scenario), s]));
  const stateLabel = (sc: Scenario, fid: string) =>
    dataset.factors.find((f) => f.id === fid)?.states.find((st) => st.id === sc[fid])?.label ?? sc[fid];
  const entityIds = [...new Set(threads.map((t) => t.entityId))];

  return (
    <Box>
      <Typography variant="overline" sx={{ color: c.mute }}>
        Published scenario threads
      </Typography>
      <Typography sx={{ fontSize: '0.78rem', color: c.mute, lineHeight: 1.5, mt: 0.25, mb: 2 }}>
        Named futures from public forecasts, mapped onto this model’s scenarios. Values and
        probabilities are under your <em>current</em> beliefs — load the entity to see its own. The
        mapped rows are tinted in the table below.
      </Typography>

      {entityIds.map((eid) => {
        const entity = presets.find((p) => p.id === eid);
        const entThreads = threads.filter((t) => t.entityId === eid);
        return (
          <Box key={eid} sx={{ mb: 2.5 }}>
            <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 1 }}>
              <Link
                component="button"
                type="button"
                onClick={() => entity && applyPreset(entity.id)}
                sx={{ fontFamily: fonts.display, fontSize: '0.92rem', fontWeight: 700, color: c.bone, textDecorationColor: c.accent }}
              >
                {entity?.name ?? eid}
              </Link>
              {entity ? <Typography sx={{ fontSize: '0.72rem', color: c.faint }}>load beliefs →</Typography> : null}
            </Stack>

            <Stack spacing={1}>
              {entThreads.map((th) => (
                <Box key={th.id} sx={{ border: `1px solid ${c.line}`, borderRadius: 1.5, p: 1.5, bgcolor: c.panel2 }}>
                  <Stack direction="row" spacing={1.25} alignItems="flex-start">
                    <Box
                      sx={{
                        flexShrink: 0,
                        width: 30,
                        height: 30,
                        borderRadius: 1,
                        border: `1px solid ${c.line}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: fonts.display,
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: c.accent,
                      }}
                    >
                      {th.id}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
                        <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, fontSize: '0.86rem', color: c.bone }}>
                          {th.title}
                        </Typography>
                        <Link
                          href={th.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ fontSize: '0.7rem', color: c.mute, display: 'inline-flex', alignItems: 'center', gap: 0.3, textDecorationColor: c.faint }}
                        >
                          source <OpenInNewIcon sx={{ fontSize: 11 }} />
                        </Link>
                      </Stack>
                      <Typography sx={{ fontSize: '0.76rem', color: c.mute, lineHeight: 1.5, mt: 0.5 }}>
                        {th.summary}
                      </Typography>

                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        {th.scenarios.map((sc, i) => {
                          const es = byKey.get(scenarioKey(sc));
                          const tag = es ? outcomeTag(es.value) : '—';
                          const multi = th.scenarios.length > 1;
                          return (
                            <Chip
                              key={i}
                              size="small"
                              title={es?.narrative ?? ''}
                              label={
                                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.6 }}>
                                  {multi ? (
                                    <Box component="span" sx={{ color: c.faint, fontSize: '0.66rem' }}>
                                      {i === 0 ? 'if it works' : 'if it fails'}
                                    </Box>
                                  ) : null}
                                  <Box component="span" sx={{ color: c.mute, fontSize: '0.66rem' }}>{tag}</Box>
                                  <Box component="span" sx={{ fontFamily: fonts.mono, fontWeight: 700, color: valueColor(es?.scalar ?? 0) }}>
                                    {fmtSigned(es?.scalar ?? 0)}
                                  </Box>
                                  <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: '0.66rem', color: c.faint }}>
                                    p={((es?.probability ?? 0) * 100).toFixed(1)}%
                                  </Box>
                                </Box>
                              }
                              sx={{ height: 'auto', py: 0.5, bgcolor: c.panel, border: `1px solid ${c.line}`, '& .MuiChip-label': { px: 1 } }}
                            />
                          );
                        })}
                      </Stack>

                      <Typography sx={{ fontSize: '0.68rem', color: c.faint, mt: 0.75 }}>
                        {th.scenarios.map((sc) => dataset.factors.map((f) => stateLabel(sc, f.id)).join(' · ')).join('   /   ')}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}
