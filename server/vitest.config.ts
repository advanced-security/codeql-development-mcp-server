import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';

export default defineConfig({
  // Transform .prompt.md imports into string literals (mirrors esbuild's
  // `loader: { '.md': 'text' }` used in the production build).
  plugins: [
    {
      name: 'raw-prompt-md',
      transform(_code: string, id: string) {
        if (id.endsWith('.prompt.md')) {
          const content = readFileSync(id, 'utf-8');
          return {
            code: `export default ${JSON.stringify(content)};`,
            map: null,
          };
        }
      },
    },
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,ts}'],
    setupFiles: ['test/setup.ts'],
    watch: false, // Disable watch mode by default
    testTimeout: 10000, // 10 second timeout for tests
    // Enhanced test isolation
    pool: 'forks', // Use process forks for better isolation
    isolate: true, // Isolate each test file
    fileParallelism: false, // Disable file-level parallelism for stability
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/types/**'],
    },
  },
  // Vitest 4 moved poolOptions to top-level config
  forks: {
    minForks: 1,
    maxForks: 4,
  },
});