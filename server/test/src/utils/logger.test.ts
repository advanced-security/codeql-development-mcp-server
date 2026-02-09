/**
 * Tests for logger utility
 *
 * All logger methods write to stderr (via console.error) because stdout is
 * reserved for the MCP JSON-RPC protocol in stdio transport mode.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Undo the global logger mock from test/setup.ts so we can test the real logger
vi.unmock('../../../src/utils/logger');

import { logger } from '../../../src/utils/logger';

describe('Logger', () => {
  const consoleSpy = {
    error: vi.fn()
  };

  beforeEach(() => {
    consoleSpy.error.mockClear();
    vi.spyOn(console, 'error').mockImplementation(consoleSpy.error);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('should log info messages to stderr with timestamp', () => {
      logger.info('Test message');

      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0][0];
      expect(call).toMatch(/\[INFO\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z Test message/);
    });

    it('should pass additional arguments', () => {
      logger.info('Test', { key: 'value' }, 123);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        { key: 'value' },
        123
      );
    });
  });

  describe('error', () => {
    it('should log error messages to stderr with timestamp', () => {
      logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0][0];
      expect(call).toMatch(/\[ERROR\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z Error message/);
    });

    it('should pass additional arguments', () => {
      const error = new Error('Test error');
      logger.error('Failed', error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        error
      );
    });
  });

  describe('warn', () => {
    it('should log warning messages to stderr with timestamp', () => {
      logger.warn('Warning message');

      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0][0];
      expect(call).toMatch(/\[WARN\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z Warning message/);
    });
  });

  describe('debug', () => {
    it('should not log debug messages when DEBUG is not set', () => {
      const originalDebug = process.env.DEBUG;
      delete process.env.DEBUG;

      logger.debug('Debug message');

      // Only the beforeEach spy call should exist, not any from logger.debug
      expect(consoleSpy.error).not.toHaveBeenCalled();

      if (originalDebug === undefined) {
        delete process.env.DEBUG;
      } else {
        process.env.DEBUG = originalDebug;
      }
    });

    it('should log debug messages to stderr when DEBUG is set', () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';

      logger.debug('Debug message');

      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0][0];
      expect(call).toMatch(/\[DEBUG\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z Debug message/);

      if (originalDebug === undefined) {
        delete process.env.DEBUG;
      } else {
        process.env.DEBUG = originalDebug;
      }
    });
  });
});
