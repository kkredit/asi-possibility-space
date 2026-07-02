/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Ad-hoc probe runner (see scripts/power-probe.ts). Run with:
//   pnpm exec vitest run --config scripts/probe.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@model': fileURLToPath(new URL('../src/model', import.meta.url)),
      '@engine': fileURLToPath(new URL('../src/engine', import.meta.url)),
      '@viz': fileURLToPath(new URL('../src/viz', import.meta.url)),
      '@shell': fileURLToPath(new URL('../src/shell', import.meta.url)),
    },
  },
  test: { globals: true, environment: 'node', include: ['scripts/power-probe.ts'] },
});
