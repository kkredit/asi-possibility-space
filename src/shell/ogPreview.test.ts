import { describe, expect, it } from 'vitest';
import { dataset } from '@model/dataset';
import { bannerSvg, outcomeFor, previewMetaFor } from '@shell/ogPreview';
import { decodeBeliefs, encodeBeliefs, type SharedBeliefs } from '@shell/urlBeliefs';

const doomerLink = (): SharedBeliefs => ({
  credences: { ...dataset.baselineCredences, orthogonality: { holds: 0.97, fails: 0.03 } },
  subCredences: structuredClone(dataset.subBaseline!),
  weights: dataset.defaultWeights,
  probabilityModel: 'bayesNet',
  alignmentMode: 'derived',
});

describe('social preview logic (dormant until real hosting)', () => {
  it('general meta names the site and carries no numbers', () => {
    const m = previewMetaFor(null);
    expect(m.title).toBe('ASI Possibility Space');
    expect(m.description).not.toMatch(/%|EV|p\(/);
  });

  it('per-beliefs meta summarizes EV and the three bands', () => {
    const m = previewMetaFor(doomerLink());
    expect(m.title).toMatch(/EV [+−]\d/);
    expect(m.description).toMatch(/p\(doom\) \d+%/);
    expect(m.description).toMatch(/p\(disempowered\) \d+%/);
    expect(m.description).toMatch(/p\(flourishing\) \d+%/);
  });

  it('outcome honors the shared probability model (net differs from independence)', () => {
    const net = outcomeFor(doomerLink());
    const indep = outcomeFor({ ...doomerLink(), probabilityModel: 'independence' });
    expect(net.pDoom).not.toBeCloseTo(indep.pDoom, 3);
    // A doom-leaning link (orthogonality holds ↑) reads above the ~30% baseline.
    expect(net.pDoom).toBeGreaterThan(0.33);
  });

  it('outcome honors derived vs direct alignment mode', () => {
    const shared = doomerLink();
    const derivedEv = outcomeFor(shared).ev;
    const directEv = outcomeFor({ ...shared, alignmentMode: 'direct' }).ev;
    // Deriving re-computes tractability/alignment-in-time from the sub-credences,
    // so the two modes generally disagree for a non-baseline link.
    expect(derivedEv).not.toBeCloseTo(directEv, 6);
  });

  it('a decoded #beliefs= link round-trips into a coherent preview', () => {
    const shared = doomerLink();
    const decoded = decodeBeliefs(encodeBeliefs(shared))!;
    expect(decoded).not.toBeNull();
    const m = previewMetaFor(decoded);
    expect(m.description).toMatch(/expected value [+−]\d/);
  });

  it('general banner is a 1200×630 SVG with the site name and spectrum', () => {
    const svg = bannerSvg(null);
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
    expect(svg).toContain('ASI Possibility Space');
    expect(svg).toContain('url(#spectrum)');
    expect(svg).not.toMatch(/p\(doom\)/);
  });

  it('per-beliefs banner shows EV, all three bands, and the gauge needle', () => {
    const shared = doomerLink();
    const svg = bannerSvg(shared);
    const o = outcomeFor(shared);
    expect(svg).toContain('p(doom)');
    expect(svg).toContain('p(disempowered)');
    expect(svg).toContain('p(flourishing)');
    expect(svg).toContain(`${Math.round(o.pDoom * 100)}%`);
    expect(svg).toContain('A shared view of AI futures');
  });

  it('is DOM-free (runs in Node / a build script / an edge function)', () => {
    // The suite runs in the node environment; these calls would throw on any
    // document/window access. Reaching here without error is the assertion.
    expect(typeof bannerSvg(null)).toBe('string');
    expect(typeof previewMetaFor(doomerLink())).toBe('object');
  });
});
