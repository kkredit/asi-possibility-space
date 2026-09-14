/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Relative base so the static bundle works under any GitHub Pages project path
// (https://<user>.github.io/<repo>/) without hard-coding the repo name. The app
// uses tab navigation, not client-side routing, so relative asset URLs are safe.
export default defineConfig({
  base: './',
  // ASI_ alongside Vite's default VITE_ prefix, so ASI_DEV=true (set via
  // .env.local or the shell) is exposed as import.meta.env.ASI_DEV.
  envPrefix: ['VITE_', 'ASI_'],
  plugins: [react()],
  resolve: {
    alias: {
      '@model': fileURLToPath(new URL('./src/model', import.meta.url)),
      '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)),
      '@viz': fileURLToPath(new URL('./src/viz', import.meta.url)),
      '@shell': fileURLToPath(new URL('./src/shell', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
