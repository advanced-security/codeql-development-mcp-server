/**
 * Global test setup for Vitest.
 *
 * Runs before every test file. Mocks shared infrastructure (like the
 * logger) so individual test files don't need to repeat the same
 * `vi.mock(...)` boilerplate and tests don't emit noisy log output.
 */

import { vi } from 'vitest';

// Suppress all logger output during unit tests.
// Individual tests that need to assert on log calls can import
// `logger` and use `vi.mocked(logger.info)` etc.
vi.mock('../src/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));
