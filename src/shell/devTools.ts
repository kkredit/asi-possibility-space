/**
 * Dev-only tooling gate. Requires BOTH a local dev server (`pnpm dev`, so
 * `import.meta.env.DEV` is true and this is stripped entirely from `pnpm build`)
 * AND the `ASI_DEV` env var set to "true" (e.g. via a `.env.local` file or
 * `ASI_DEV=true pnpm dev`), so exploratory/incomplete surfaces stay off by
 * default even for local contributors who haven't opted in.
 */
export const DEV_TOOLS = import.meta.env.DEV && import.meta.env.ASI_DEV === 'true';
