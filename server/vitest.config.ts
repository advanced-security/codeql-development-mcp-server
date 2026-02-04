import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,ts}'],
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