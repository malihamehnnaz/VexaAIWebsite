import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// First test setup in this repo — every prior integration (GA4, Instagram,
// Search Console, Messenger, Facebook Comments) was instead verified via
// live production testing. Scoped narrowly to src/**/*.test.ts so it never
// picks up anything under .next/ or node_modules/.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
