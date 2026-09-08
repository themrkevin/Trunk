import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: '#app', replacement: new URL('./src/app.ts', import.meta.url).pathname },
      { find: '#core', replacement: new URL('./src/core', import.meta.url).pathname },
      { find: '#features', replacement: new URL('./src/features', import.meta.url).pathname },
    ],
  },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    globals: false,
    restoreMocks: true,
  },
});
