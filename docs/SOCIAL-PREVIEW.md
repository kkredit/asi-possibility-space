# Social / chat link previews

When a link to this app is dropped in Slack, X, Discord, iMessage, LinkedIn, etc.,
the client fetches the URL **server-side**, reads the static `<meta>` tags, and
renders a card. Two things are true of every one of those unfurlers:

1. They **run no JavaScript** — they read the HTML as served.
2. They **never receive the URL hash** (`#…`) — fragments aren't sent to servers.

## What ships today (static, works now)

A **general banner** for every link:

- `index.html` carries Open Graph + Twitter Card meta pointing at
  `og-banner.png`.
- `public/og-banner.png` (1200×630) is generated from
  [`bannerSvg(null)`](../src/shell/ogPreview.ts) by
  [`scripts/gen-og.ts`](../scripts/gen-og.ts). Regenerate after a design/scenario-
  count change and commit the PNG:

  ```bash
  pnpm exec vitest run --config scripts/og.config.ts
  ```

> **At publish time:** set `og:url`, `og:image`, and `twitter:image` to **absolute**
> URLs (`https://your-domain/og-banner.png`). Relative image paths work in some
> unfurlers but not all.

Because the belief set lives in the hash (`#beliefs=…`, see
[`urlBeliefs.ts`](../src/shell/urlBeliefs.ts)), a shared custom-belief link shows
this same general banner — the unfurler can't see the hash, and on static hosting
there is no server to render a per-link card.

## What's built but DORMANT (awaiting a real host)

The per-beliefs preview is fully implemented and unit-tested in
[`ogPreview.ts`](../src/shell/ogPreview.ts) — it just isn't wired to anything live:

- `previewMetaFor(shared)` → the `<title>` / `og:description` summarizing a belief
  set (EV and the three outcome bands).
- `bannerSvg(shared)` → the 1200×630 per-beliefs card (EV, spectrum gauge with a
  needle, p(doom) / p(disempowered) / p(flourishing)).
- `outcomeFor(shared)` runs the real engine on the shared beliefs, honoring the
  link's probability model and derived/direct alignment mode.

Everything is DOM-free, so the same code runs in the browser, a build script, or an
edge function unchanged.

### Wiring it up once off static hosting

On a function-capable host (Vercel / Netlify / Cloudflare):

1. **Move belief sharing hash → query.** Change the "Copy link" button and the
   store's URL read/write from `#beliefs=` to `?beliefs=` so a server can see it.
   (`decodeBeliefs` is unchanged; only where the string is read differs.)
2. **Add an edge handler** for the app's HTML route that:
   - reads `?beliefs=`, `decodeBeliefs(...)` it (null → general);
   - injects `previewMetaFor(shared)` into `<title>` / `og:*` / `twitter:*`;
   - points `og:image` at an image route.
3. **Add an image route** `/og?beliefs=…` that decodes, calls `bannerSvg(shared)`,
   rasterizes with `@resvg/resvg-js` (already a devDependency; used by
   `gen-og.ts`), and returns `image/png`.

No app logic changes beyond the hash→query move; the rendering and metadata are
already done and tested (`ogPreview.test.ts`).
