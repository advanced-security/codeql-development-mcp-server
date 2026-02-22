import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,ts}'],
    exclude: ['test/suite/**'],
    watch: false,
    testTimeout: 10000,
    alias: {
      vscode: fileURLToPath(new URL('./__mocks__/vscode.ts', import.meta.url)),
    },
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
