/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

// Standalone vitest config so the findings miner (scripts/) can import the engine
// via the same @-aliases the app uses. Run with:
//   pnpm exec vitest run --config scripts/findings.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@model': fileURLToPath(new URL('../src/model', import.meta.url)),
      '@engine': fileURLToPath(new URL('../src/engine', import.meta.url)),
      '@viz': fileURLToPath(new URL('../src/viz', import.meta.url)),
      '@shell': fileURLToPath(new URL('../src/shell', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/mine-findings.ts'],
    testTimeout: 60_000,
  },
});
