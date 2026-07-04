/**
 * Renders the GENERAL social-preview banner to public/og-banner.png (1200×630).
 * The per-beliefs banner is rendered on demand by an edge function on a real host
 * (see docs/SOCIAL-PREVIEW.md); this static PNG is what every link shows today.
 *
 * Wired as a vitest "test" to borrow the @-aliases (like the doc scripts):
 *   pnpm exec vitest run --config scripts/og.config.ts
 * Regenerate whenever the banner design or scenario count changes; commit the PNG.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { test } from 'vitest';
import { Resvg } from '@resvg/resvg-js';
import { bannerSvg } from '@shell/ogPreview';

test('generate og-banner.png', () => {
  const svg = bannerSvg(null);
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: true } }).render().asPng();
  const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/og-banner.png');
  writeFileSync(out, png);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${png.length} bytes to ${out}`);
});
