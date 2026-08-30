import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { FACTOR_KINDS, type BayesNet, type Factor } from '@model/types';
import { c, fonts, kindColor } from '@shell/theme';
import { wrapLabel } from '@viz/text';

interface Props {
  net: BayesNet;
  factors: Factor[];
}

/**
 * Layered drawing of the Bayes-net DAG: roots (priors from the sliders) on top,
 * children below, arrows pointing parent → child. Nodes are colored by factor kind;
 * hover a node for the dependency rationale.
 */
export function BayesNetDiagram({ net, factors }: Props) {
  const factorById = new Map(factors.map((f) => [f.id, f]));
  const nodeById = new Map(net.nodes.map((n) => [n.factor, n]));

  // Depth = longest path from a root (memoized over the acyclic graph).
  const depthCache = new Map<string, number>();
  const depth = (fid: string): number => {
    if (depthCache.has(fid)) return depthCache.get(fid)!;
    const node = nodeById.get(fid);
    const d = !node || node.parents.length === 0 ? 0 : 1 + Math.max(...node.parents.map(depth));
    depthCache.set(fid, d);
    return d;
  };

  const layers: string[][] = [];
  for (const n of net.nodes) {
    const d = depth(n.factor);
    (layers[d] ??= []).push(n.factor);
  }

  const nodeW = 150;
  const nodeH = 54;
  const rowGap = 116;
  const padX = 16;
  const top = 30;
  const width = 680;
  const height = top + (layers.length - 1) * rowGap + nodeH + 24;

  const center = (fid: string): { cx: number; cy: number } => {
    const d = depth(fid);
    const row = layers[d];
    const i = row.indexOf(fid);
    const span = (width - 2 * padX) / row.length;
    return { cx: padX + (i + 0.5) * span, cy: top + d * rowGap + nodeH / 2 };
  };

  return (
    <Box>
      <Box sx={{ overflowX: 'auto' }}>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Bayes-net diagram" style={{ minWidth: 560 }}>
          <defs>
            <marker id="bn-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill={c.faint} />
            </marker>
          </defs>

          {/* edges: parent → child */}
          {net.nodes.flatMap((n) =>
            n.parents.map((p) => {
              const a = center(p);
              const b = center(n.factor);
              // stop the line at the child's top edge so the arrowhead sits on the box
              const angle = Math.atan2(b.cy - a.cy, b.cx - a.cx);
              const x2 = b.cx - Math.cos(angle) * (nodeH / 2 + 2);
              const y2 = b.cy - Math.sin(angle) * (nodeH / 2 + 2);
              return (
                <line
                  key={`${p}-${n.factor}`}
                  x1={a.cx}
                  y1={a.cy + nodeH / 2 - 4}
                  x2={x2}
                  y2={y2}
                  stroke={c.faint}
                  strokeWidth={1}
                  markerEnd="url(#bn-arrow)"
                  opacity={0.7}
                />
              );
            }),
          )}

          {/* nodes */}
          {net.nodes.map((n) => {
            const f = factorById.get(n.factor);
            const { cx, cy } = center(n.factor);
            const kc = f ? kindColor[f.kind] : c.slate;
            const lines = wrapLabel(f?.label ?? n.factor, 19, 3);
            const isRoot = n.parents.length === 0;
            const title = `${f?.label ?? n.factor}${isRoot ? ' (root: prior from your slider)' : ''}${n.note ? `\n${n.note}` : ''}`;
            return (
              <Tooltip key={n.factor} title={title} arrow>
                <g style={{ cursor: 'help' }}>
                  <rect
                    x={cx - nodeW / 2}
                    y={cy - nodeH / 2}
                    width={nodeW}
                    height={nodeH}
                    rx={7}
                    fill={c.panel2}
                    stroke={kc}
                    strokeWidth={1.5}
                  />
                  <text x={cx} y={cy} fill={c.bone} fontSize={11} fontFamily={fonts.display} textAnchor="middle" dominantBaseline="middle">
                    {lines.map((ln, i) => (
                      <tspan key={i} x={cx} dy={i === 0 ? -(lines.length - 1) * 6 : 12}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                </g>
              </Tooltip>
            );
          })}
        </svg>
      </Box>

      {/* kind legend */}
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{
          flexWrap: "wrap",
          mt: 1
        }}>
        {FACTOR_KINDS.map((k) => (
          <Stack key={k} direction="row" spacing={0.75} sx={{
            alignItems: "center"
          }}>
            <Box sx={{ width: 11, height: 11, border: `1.5px solid ${kindColor[k]}`, borderRadius: 0.5, bgcolor: c.panel2 }} />
            <Typography variant="caption" sx={{ color: c.mute, textTransform: 'capitalize' }}>{k}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
