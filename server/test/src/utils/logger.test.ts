/**
 * Tests for logger utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '../../../src/utils/logger';

describe('Logger', () => {
  const consoleSpy = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(consoleSpy.log);
    vi.spyOn(console, 'error').mockImplementation(consoleSpy.error);
    vi.spyOn(console, 'warn').mockImplementation(consoleSpy.warn);
    vi.spyOn(console, 'debug').mockImplementation(consoleSpy.debug);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('info', () => {
    it('should log info messages with timestamp', () => {
      logger.info('Test message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toMatch(/\[INFO\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z Test message/);
    });

    it('should pass additional arguments', () => {
      logger.info('Test', { key: 'value' }, 123);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        { key: 'value' },
        123
      );
    });
  });

  describe('error', () => {
    it('should log error messages with timestamp', () => {
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
    it('should log warning messages with timestamp', () => {
      logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalled();
      const call = consoleSpy.warn.mock.calls[0][0];
      expect(call).toMatch(/\[WARN\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z Warning message/);
    });
  });

  describe('debug', () => {
    it('should not log debug messages when DEBUG is not set', () => {
      const originalDebug = process.env.DEBUG;
      delete process.env.DEBUG;

      logger.debug('Debug message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();

      process.env.DEBUG = originalDebug;
    });

    it('should log debug messages when DEBUG is set', () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = 'true';

      logger.debug('Debug message');

      expect(consoleSpy.debug).toHaveBeenCalled();
      const call = consoleSpy.debug.mock.calls[0][0];
      expect(call).toMatch(/\[DEBUG\] \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z Debug message/);

      process.env.DEBUG = originalDebug;
    });
  });
});
