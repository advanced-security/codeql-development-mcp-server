/**
 * Tests for server configuration types and utilities.
 */

import { describe, expect, it } from 'vitest';
import {
  buildCLIServerArgs,
  buildLanguageServerArgs,
  buildQueryServerArgs,
  computeConfigHash,
  CLIServerConfig,
  LanguageServerConfig,
  QueryServerConfig,
} from '../../../src/lib/server-config';

describe('server-config', () => {
  describe('buildCLIServerArgs', () => {
    it('should build minimal args', () => {
      const config: CLIServerConfig = {};
      const args = buildCLIServerArgs(config);
      expect(args).toEqual(['execute', 'cli-server']);
    });

    it('should include commonCaches', () => {
      const config: CLIServerConfig = { commonCaches: '/cache' };
      const args = buildCLIServerArgs(config);
      expect(args).toContain('--common-caches=/cache');
    });

    it('should include logdir', () => {
      const config: CLIServerConfig = { logdir: '/logs' };
      const args = buildCLIServerArgs(config);
      expect(args).toContain('--logdir=/logs');
    });
  });

  describe('buildLanguageServerArgs', () => {
    it('should build args with default check-errors', () => {
      const config: LanguageServerConfig = {};
      const args = buildLanguageServerArgs(config);
      expect(args).toEqual([
        'execute', 'language-server',
        '--check-errors=ON_CHANGE',
      ]);
    });

    it('should include all optional args', () => {
      const config: LanguageServerConfig = {
        checkErrors: 'EXPLICIT',
        commonCaches: '/cache',
        logdir: '/logs',
        loglevel: 'DEBUG',
        searchPath: '/path/to/ql',
        synchronous: true,
        verbosity: 'progress+',
      };
      const args = buildLanguageServerArgs(config);

      expect(args).toContain('--check-errors=EXPLICIT');
      expect(args).toContain('--search-path=/path/to/ql');
      expect(args).toContain('--common-caches=/cache');
      expect(args).toContain('--logdir=/logs');
      expect(args).toContain('--loglevel=DEBUG');
      expect(args).toContain('--synchronous');
      expect(args).toContain('--verbosity=progress+');
    });

    it('should not include absent optional args', () => {
      const config: LanguageServerConfig = { searchPath: '/ql' };
      const args = buildLanguageServerArgs(config);

      expect(args).not.toContain(expect.stringContaining('--logdir'));
      expect(args).not.toContain('--synchronous');
    });
  });

  describe('buildQueryServerArgs', () => {
    it('should build minimal args', () => {
      const config: QueryServerConfig = {};
      const args = buildQueryServerArgs(config);
      expect(args).toEqual(['execute', 'query-server2']);
    });

    it('should include all optional args', () => {
      const config: QueryServerConfig = {
        commonCaches: '/cache',
        evaluatorLog: '/log.json',
        logdir: '/logs',
        maxDiskCache: 2048,
        searchPath: '/path/to/ql',
        threads: 4,
        timeout: 60,
        tupleCounting: true,
      };
      const args = buildQueryServerArgs(config);

      expect(args).toContain('--search-path=/path/to/ql');
      expect(args).toContain('--common-caches=/cache');
      expect(args).toContain('--logdir=/logs');
      expect(args).toContain('--threads=4');
      expect(args).toContain('--timeout=60');
      expect(args).toContain('--max-disk-cache=2048');
      expect(args).toContain('--evaluator-log=/log.json');
      expect(args).toContain('--tuple-counting');
    });

    it('should add debug and tuple-counting for debug mode', () => {
      const config: QueryServerConfig = { debug: true };
      const args = buildQueryServerArgs(config);

      expect(args).toContain('--debug');
      expect(args).toContain('--tuple-counting');
    });

    it('should not duplicate --tuple-counting when both debug and tupleCounting are set', () => {
      const config: QueryServerConfig = { debug: true, tupleCounting: true };
      const args = buildQueryServerArgs(config);

      const tupleCountingOccurrences = args.filter(a => a === '--tuple-counting').length;
      expect(tupleCountingOccurrences).toBe(1);
      expect(args).toContain('--debug');
    });

    it('should handle zero threads', () => {
      const config: QueryServerConfig = { threads: 0 };
      const args = buildQueryServerArgs(config);
      expect(args).toContain('--threads=0');
    });
  });

  describe('computeConfigHash', () => {
    it('should return identical hash for identical config', () => {
      const config: LanguageServerConfig = { loglevel: 'WARN', searchPath: '/ql' };
      const hash1 = computeConfigHash('language', config);
      const hash2 = computeConfigHash('language', config);
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different config', () => {
      const config1: LanguageServerConfig = { loglevel: 'WARN' };
      const config2: LanguageServerConfig = { loglevel: 'DEBUG' };
      const hash1 = computeConfigHash('language', config1);
      const hash2 = computeConfigHash('language', config2);
      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash for different server types', () => {
      const config: LanguageServerConfig = { loglevel: 'WARN' };
      const hash1 = computeConfigHash('language', config);
      const hash2 = computeConfigHash('query', config);
      expect(hash1).not.toBe(hash2);
    });

    it('should return a 64-character hex string (SHA-256)', () => {
      const hash = computeConfigHash('cli', {});
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
