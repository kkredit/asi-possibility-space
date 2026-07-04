import { dataset } from '@model/dataset';
import type { ValueVector } from '@model/types';
import {
  analyze,
  disempowermentMass,
  doomMass,
  flourishingMass,
  getEvaluator,
  reconcileJoint,
} from '@engine/index';
import { deriveCredences } from '@engine/derive';
import type { SharedBeliefs } from '@shell/urlBeliefs';

/**
 * ============================================================================
 *  SOCIAL / CHAT LINK PREVIEW — currently DORMANT.
 * ----------------------------------------------------------------------------
 * A link unfurler (Slack, X, Discord, iMessage, LinkedIn) fetches the URL
 * server-side, reads the static <meta> tags, runs no JS, and never receives the
 * URL hash. On the current static GitHub Pages host that means:
 *   • the GENERAL banner + meta (baked into index.html and public/og-banner.png)
 *     is what every shared link shows today, and
 *   • a PER-BELIEFS card cannot be produced from a `#beliefs=` link — an unfurler
 *     can't see the hash and there's no server to render per-link meta/images.
 *
 * The per-beliefs logic below is therefore built, unit-tested, and READY but not
 * wired to anything live. When the site moves to a function-capable host, an edge
 * handler decodes `?beliefs=` (query, not hash), calls `previewMetaFor(...)` for
 * the <meta> and `bannerSvg(...)` (rasterized) for og:image, and injects them.
 * See docs/SOCIAL-PREVIEW.md for the wiring plan. Nothing here imports the DOM,
 * so it runs in a browser, a build script, or an edge function unchanged.
 * ============================================================================
 */

const W = 1200;
const H = 630;

// Local palette (mirrors src/shell/theme.ts `c`) — kept inline so this module has
// no MUI dependency and runs in a bare Node / edge context.
const COL = {
  ink: '#0B0E14',
  panel: '#12161F',
  line: '#232B3A',
  bone: '#E8E6DF',
  mute: '#8A93A6',
  faint: '#5B6473',
  red: '#E4564A',
  slate: '#5A6577',
  teal: '#34D3B5',
  accent: '#3FB2A2',
};

function mix(a: string, b: string, t: number): string {
  const h = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const [ar, ag, ab] = h(a);
  const [br, bg, bb] = h(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}
/** Diverging value color, matching theme.valueColor: red (−1) → slate (0) → teal (+1). */
function valueColor(v: number): string {
  const t = Math.max(-1, Math.min(1, v));
  return t < 0 ? mix(COL.slate, COL.red, -t) : mix(COL.slate, COL.teal, t);
}

export interface PreviewMeta {
  title: string;
  description: string;
}

export interface PreviewOutcome {
  ev: number;
  pDoom: number;
  pDisempowered: number;
  pFlourishing: number;
  evVector: ValueVector;
}

/** Run the model on a shared belief set exactly as the app does on load. */
export function outcomeFor(shared: SharedBeliefs): PreviewOutcome {
  const stated = { ...dataset.baselineCredences, ...shared.credences };
  const credences =
    shared.alignmentMode === 'derived' ? deriveCredences(dataset, stated, shared.subCredences) : stated;
  const evaluator = getEvaluator('cached'); // shared links don't carry evaluator id today; cached is the reference
  const joint =
    shared.probabilityModel === 'bayesNet' && dataset.bayesNet
      ? reconcileJoint(dataset.bayesNet, dataset.factors, credences, credences).probability
      : undefined;
  const a = analyze(dataset, credences, shared.weights, evaluator, {}, joint);
  return {
    ev: a.ev,
    pDoom: doomMass(a.scenarios),
    pDisempowered: disempowermentMass(a.scenarios),
    pFlourishing: flourishingMass(a.scenarios),
    evVector: a.evVector,
  };
}

const fmtSigned = (v: number, d = 2) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`;
const pctOf = (v: number) => `${Math.round(v * 100)}%`;

/** The <title>/<meta description> for a link: general, or a per-beliefs summary. */
export function previewMetaFor(shared: SharedBeliefs | null): PreviewMeta {
  if (!shared) {
    return {
      title: 'ASI Possibility Space',
      description:
        'An instrument for reasoning about AI futures: set your credences over the key questions and see the outcome distribution, expected value, and where the leverage is.',
    };
  }
  const o = outcomeFor(shared);
  return {
    title: `A shared view of AI futures — EV ${fmtSigned(o.ev)}`,
    description: `This belief set implies expected value ${fmtSigned(o.ev)} · p(doom) ${pctOf(
      o.pDoom,
    )} · p(disempowered) ${pctOf(o.pDisempowered)} · p(flourishing) ${pctOf(
      o.pFlourishing,
    )}. Open to explore or adjust the beliefs behind it.`,
  };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = (
  x: number,
  y: number,
  s: string,
  size: number,
  fill: string,
  opts: { weight?: number; anchor?: string; family?: string; spacing?: number } = {},
) =>
  `<text x="${x}" y="${y}" font-family="${opts.family ?? 'Inter, Helvetica, Arial, sans-serif'}" font-size="${size}" font-weight="${opts.weight ?? 400}" fill="${fill}" text-anchor="${opts.anchor ?? 'start'}"${opts.spacing ? ` letter-spacing="${opts.spacing}"` : ''}>${esc(s)}</text>`;

const MONO = 'JetBrains Mono, Menlo, monospace';

/** The spectrum gauge bar (red→slate→teal) with an optional needle at value `v`. */
function spectrumBar(x: number, y: number, w: number, h: number, v?: number): string {
  const needle =
    v === undefined
      ? ''
      : `<rect x="${x + ((Math.max(-1, Math.min(1, v)) + 1) / 2) * w - 2.5}" y="${y - 6}" width="5" height="${h + 12}" rx="2.5" fill="${COL.bone}" />`;
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="url(#spectrum)" />
    <rect x="${x + w / 2 - 0.5}" y="${y - 4}" width="1" height="${h + 8}" fill="rgba(255,255,255,0.35)" />
    ${needle}`;
}

/**
 * The 1200×630 preview banner as an SVG string. `shared === null` → the general
 * site banner; otherwise the per-beliefs card (EV, the three outcome bands, gauge).
 */
export function bannerSvg(shared: SharedBeliefs | null): string {
  const scenarioCount = dataset.factors.reduce((n, f) => n * f.states.length, 1).toLocaleString();
  const defs = `
    <defs>
      <linearGradient id="spectrum" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${COL.red}" />
        <stop offset="50%" stop-color="${COL.slate}" />
        <stop offset="100%" stop-color="${COL.teal}" />
      </linearGradient>
    </defs>`;
  const frame = `
    <rect width="${W}" height="${H}" fill="${COL.ink}" />
    <rect x="0" y="0" width="${W}" height="6" fill="${COL.accent}" />`;

  if (!shared) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      ${defs}${frame}
      ${text(72, 250, 'ASI Possibility Space', 76, COL.bone, { weight: 700, family: 'Space Grotesk, Inter, sans-serif' })}
      ${text(74, 312, 'an instrument for reasoning about AI futures', 34, COL.mute, { family: 'Space Grotesk, Inter, sans-serif' })}
      ${spectrumBar(74, 400, W - 148, 20)}
      ${text(74, 460, '← extinction', 24, COL.red, { family: 'Space Grotesk, Inter, sans-serif' })}
      ${text(W - 74, 460, 'flourishing →', 24, COL.teal, { anchor: 'end', family: 'Space Grotesk, Inter, sans-serif' })}
      ${text(74, 560, `${scenarioCount}-scenario model · set your beliefs, see the futures`, 24, COL.faint, { family: MONO })}
    </svg>`;
  }

  const o = outcomeFor(shared);
  const band = (cx: number, label: string, v: number, color: string) =>
    `${text(cx, 470, label, 26, COL.mute, { anchor: 'middle', family: 'Space Grotesk, Inter, sans-serif', spacing: 1 })}
     ${text(cx, 540, pctOf(v), 68, color, { anchor: 'middle', weight: 700, family: MONO })}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs}${frame}
    ${text(72, 118, 'A shared view of AI futures', 46, COL.bone, { weight: 700, family: 'Space Grotesk, Inter, sans-serif' })}
    ${text(74, 162, 'ASI Possibility Space · open to explore or adjust these beliefs', 26, COL.mute, { family: 'Space Grotesk, Inter, sans-serif' })}
    ${text(74, 250, 'EXPECTED VALUE OF THE FUTURE', 24, COL.mute, { family: 'Space Grotesk, Inter, sans-serif', spacing: 2 })}
    ${text(74, 330, fmtSigned(o.ev, 3), 84, valueColor(o.ev), { weight: 700, family: MONO })}
    ${spectrumBar(74, 372, W - 148, 18, o.ev)}
    ${band(260, 'p(doom)', o.pDoom, valueColor(-Math.min(1, o.pDoom * 2)))}
    ${band(600, 'p(disempowered)', o.pDisempowered, valueColor(-Math.min(1, o.pDisempowered * 2)))}
    ${band(940, 'p(flourishing)', o.pFlourishing, valueColor(Math.min(1, o.pFlourishing * 2)))}
    <rect x="430" y="450" width="1" height="90" fill="${COL.line}" />
    <rect x="770" y="450" width="1" height="90" fill="${COL.line}" />
    ${text(74, 596, 'the three bands don’t sum to 1 — the rest is the ambiguous middle', 22, COL.faint, { family: MONO })}
  </svg>`;
}
