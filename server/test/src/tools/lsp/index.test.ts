/**
 * Tests for LSP tools barrel export (index.ts).
 *
 * Verifies that all public exports are accessible via the index module.
 */

import { describe, expect, it, vi } from 'vitest';

// Mock heavy dependencies so we don't spawn real processes
vi.mock('../../../../src/lib/server-manager', () => ({
  getServerManager: vi.fn(() => ({
    getLanguageServer: vi.fn().mockResolvedValue({}),
    shutdownServer: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../../src/utils/package-paths', () => ({
  getPackageRootDir: vi.fn(() => '/mock/pkg'),
  packageRootDir: '/mock/pkg',
}));

vi.mock('../../../../src/utils/temp-dir', () => ({
  createProjectTempDir: vi.fn((prefix: string) => `/mock/.tmp/${prefix}test`),
  getProjectTmpBase: vi.fn(() => '/mock/.tmp'),
  getProjectTmpDir: vi.fn((name: string) => `/mock/.tmp/${name}`),
}));

import {
  lspCompletion,
  lspDefinition,
  lspDiagnostics,
  lspReferences,
  registerLSPTools,
  registerLspDiagnosticsTool,
  shutdownDiagnosticsServer,
} from '../../../../src/tools/lsp';

describe('lsp/index exports', () => {
  it('should export lspCompletion', () => {
    expect(typeof lspCompletion).toBe('function');
  });

  it('should export lspDefinition', () => {
    expect(typeof lspDefinition).toBe('function');
  });

  it('should export lspDiagnostics', () => {
    expect(typeof lspDiagnostics).toBe('function');
  });

  it('should export lspReferences', () => {
    expect(typeof lspReferences).toBe('function');
  });

  it('should export registerLSPTools', () => {
    expect(typeof registerLSPTools).toBe('function');
  });

  it('should export registerLspDiagnosticsTool', () => {
    expect(typeof registerLspDiagnosticsTool).toBe('function');
  });

  it('should export shutdownDiagnosticsServer', () => {
    expect(typeof shutdownDiagnosticsServer).toBe('function');
  });
});
