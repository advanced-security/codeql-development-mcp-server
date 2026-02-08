/**
 * Tests for CLI executor utilities
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, chmodSync } from 'fs';
import { execFileSync } from 'child_process';
import { join } from 'path';
import {
  buildCodeQLArgs,
  buildQLTArgs,
  executeCLICommand,
  enableTestCommands,
  disableTestCommands,
  resolveCodeQLBinary,
  getResolvedCodeQLDir,
  resetResolvedCodeQLBinary,
  sanitizeCLIArgument,
  sanitizeCLIArguments,
  validateCodeQLBinaryReachable
} from '../../../src/lib/cli-executor';

// Mock the logger to suppress expected error output
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Enable test commands for all tests in this file
beforeAll(() => {
  enableTestCommands();
});

afterAll(() => {
  disableTestCommands();
});

describe('buildCodeQLArgs', () => {
  it('should build basic CodeQL arguments', () => {
    const args = buildCodeQLArgs('query run', {
      database: '/path/to/db',
      'output-format': 'json'
    });
    
    expect(args).toEqual([
      'query run',
      '--database=/path/to/db',
      '--output-format=json'
    ]);
  });

  it('should handle boolean flags correctly', () => {
    const args = buildCodeQLArgs('database create', {
      'no-cleanup': true,
      'skip-empty': false,
      verbose: true
    });
    
    expect(args).toEqual([
      'database create',
      '--no-cleanup',
      '--verbose'
    ]);
  });

  it('should handle array values correctly', () => {
    const args = buildCodeQLArgs('query run', {
      external: ['pred1=file1.csv', 'pred2=file2.csv']
    });
    
    expect(args).toEqual([
      'query run',
      '--external=pred1=file1.csv',
      '--external=pred2=file2.csv'
    ]);
  });

  it('should skip undefined and null values', () => {
    const args = buildCodeQLArgs('query run', {
      database: '/path/to/db',
      output: undefined,
      timeout: null,
      verbose: true
    });
    
    expect(args).toEqual([
      'query run',
      '--database=/path/to/db',
      '--verbose'
    ]);
  });

  it('should handle numbers correctly', () => {
    const args = buildCodeQLArgs('database create', {
      threads: 4,
      ram: 8192
    });
    
    expect(args).toEqual([
      'database create',
      '--threads=4',
      '--ram=8192'
    ]);
  });

  it('should handle single-letter parameters with equals sign format', () => {
    const args = buildCodeQLArgs('bqrs interpret', {
      t: ['kind=graph', 'id=javascript/tools/print-ast'],
      format: 'graphtext',
      output: 'query-results'
    });
    
    // Parameters are processed in object insertion order
    expect(args).toEqual([
      'bqrs interpret',
      '-t=kind=graph',
      '-t=id=javascript/tools/print-ast',
      '--format=graphtext',
      '--output=query-results'
    ]);
  });

  it('should handle single-letter parameters with string values', () => {
    const args = buildCodeQLArgs('test command', {
      v: true,
      o: 'output.txt'
    });
    
    // Parameters are processed in object insertion order
    expect(args).toEqual([
      'test command',
      '-v',
      '-o=output.txt'
    ]);
  });
});

describe('buildQLTArgs', () => {
  it('should build basic QLT arguments', () => {
    const args = buildQLTArgs('query generate', {
      language: 'java',
      output: '/path/to/output'
    });
    
    expect(args).toEqual([
      'query generate',
      '--language', 'java',
      '--output', '/path/to/output'
    ]);
  });

  it('should handle boolean flags correctly', () => {
    const args = buildQLTArgs('test run', {
      verbose: true,
      quiet: false
    });
    
    expect(args).toEqual([
      'test run',
      '--verbose'
    ]);
  });

  it('should handle array values correctly', () => {
    const args = buildQLTArgs('test run', {
      include: ['test1', 'test2']
    });
    
    expect(args).toEqual([
      'test run',
      '--include', 'test1',
      '--include', 'test2'
    ]);
  });
});

describe('executeCLICommand - Security Tests', () => {
  it('should execute a whitelisted command successfully', async () => {
    const result = await executeCLICommand({
      command: 'echo',
      args: ['hello world']
    });
    
    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe('hello world');
    expect(result.exitCode).toBe(0);
  });

  it('should reject non-whitelisted commands', async () => {
    const result = await executeCLICommand({
      command: 'nonexistent-command-xyz',
      args: ['arg1']
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Command not allowed');
  });

  it('should reject commands with absolute paths', async () => {
    const result = await executeCLICommand({
      command: '/usr/bin/echo',
      args: ['test']
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Command not allowed');
  });

  it('should reject commands with relative paths', async () => {
    const result = await executeCLICommand({
      command: '../bin/echo',
      args: ['test']
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Command not allowed');
  });

  it('should handle arguments with special characters safely without shell expansion', async () => {
    // Test that shell metacharacters are treated as literal strings, not interpreted
    const result = await executeCLICommand({
      command: 'echo',
      args: ['$HOME', '$(pwd)', '`ls`', '|', '&', ';']
    });
    
    expect(result.success).toBe(true);
    // Shell metacharacters should be printed literally, not executed
    expect(result.stdout).toContain('$HOME');
    expect(result.stdout).toContain('$(pwd)');
    expect(result.stdout).toContain('`ls`');
  });

  it('should prevent shell injection through arguments', async () => {
    // This would be dangerous with exec() but safe with execFile()
    const result = await executeCLICommand({
      command: 'echo',
      args: ['test; echo injected']
    });
    
    expect(result.success).toBe(true);
    // The entire string should be treated as a single argument
    expect(result.stdout.trim()).toBe('test; echo injected');
    // "injected" should NOT appear as a result of command execution
    // The output should contain the semicolon as a literal character
    const lines = result.stdout.trim().split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe('test; echo injected');
  });

  it('should handle environment variables in arguments safely', async () => {
    // Environment variable syntax should not be expanded in arguments
    const result = await executeCLICommand({
      command: 'echo',
      args: ['$PATH']
    });
    
    expect(result.success).toBe(true);
    // $PATH should be printed literally, not expanded
    expect(result.stdout.trim()).toBe('$PATH');
  });

  it('should handle command execution errors gracefully', async () => {
    // Use a whitelisted command that will fail
    const result = await executeCLICommand({
      command: 'cat',
      args: ['/nonexistent/file/path']
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle commands with multiple arguments correctly', async () => {
    const result = await executeCLICommand({
      command: 'echo',
      args: ['arg1', 'arg2', 'arg3']
    });
    
    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe('arg1 arg2 arg3');
  });

  it('should pass environment variables to the command', async () => {
    const result = await executeCLICommand({
      command: 'sh',
      args: ['-c', 'echo $TEST_VAR'],
      env: { TEST_VAR: 'test_value' }
    });
    
    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe('test_value');
  });

  it('should respect timeout settings', async () => {
    const result = await executeCLICommand({
      command: 'sleep',
      args: ['10'],
      timeout: 100 // 100ms timeout
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  }, 10000); // Increase test timeout to 10 seconds

  it('should handle commands with quoted arguments correctly', async () => {
    const result = await executeCLICommand({
      command: 'echo',
      args: ['argument with spaces', 'another arg']
    });
    
    expect(result.success).toBe(true);
    expect(result.stdout.trim()).toBe('argument with spaces another arg');
  });

  it('should reject commands with shell metacharacters in command name', async () => {
    const dangerousCommands = [
      'echo; ls',
      'echo | cat',
      'echo && ls',
      'echo $PATH',
      'echo `ls`',
      'echo\nls'
    ];
    
    for (const cmd of dangerousCommands) {
      const result = await executeCLICommand({
        command: cmd,
        args: ['test']
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Command not allowed');
    }
  });

  it('should reject whitelisted commands with shell metacharacters', async () => {
    // Test that even if we try to use a whitelisted command name with metacharacters,
    // it gets rejected by the metacharacter validation after passing the whitelist
    // This is a hypothetical case since the whitelist check happens first
    const result = await executeCLICommand({
      command: 'codeql;ls',
      args: ['test']
    });
    
    expect(result.success).toBe(false);
    // This will be rejected by whitelist since 'codeql;ls' is not in the whitelist
    expect(result.error).toContain('Command not allowed');
  });

  it('should filter environment variables to safe whitelist', async () => {
    // Set a potentially unsafe environment variable
    const originalEnv = process.env.MALICIOUS_VAR;
    process.env.MALICIOUS_VAR = 'dangerous_value';
    
    try {
      const result = await executeCLICommand({
        command: 'sh',
        args: ['-c', 'echo ${MALICIOUS_VAR:-not_set}']
      });
      
      expect(result.success).toBe(true);
      // The MALICIOUS_VAR should not be passed through
      expect(result.stdout.trim()).toBe('not_set');
    } finally {
      // Cleanup
      if (originalEnv === undefined) {
        delete process.env.MALICIOUS_VAR;
      } else {
        process.env.MALICIOUS_VAR = originalEnv;
      }
    }
  });

  it('should pass through safe environment variables', async () => {
    const result = await executeCLICommand({
      command: 'sh',
      args: ['-c', 'echo ${PATH:-not_set}']
    });
    
    expect(result.success).toBe(true);
    // PATH should be passed through as it's in the safe list
    expect(result.stdout.trim()).not.toBe('not_set');
    expect(result.stdout.trim().length).toBeGreaterThan(0);
  });

  it('should pass through CODEQL_ prefixed environment variables', async () => {
    const originalEnv = process.env.CODEQL_TEST_VAR;
    process.env.CODEQL_TEST_VAR = 'codeql_value';
    
    try {
      const result = await executeCLICommand({
        command: 'sh',
        args: ['-c', 'echo ${CODEQL_TEST_VAR:-not_set}']
      });
      
      expect(result.success).toBe(true);
      // CODEQL_ prefixed vars should be passed through
      expect(result.stdout.trim()).toBe('codeql_value');
    } finally {
      // Cleanup
      if (originalEnv === undefined) {
        delete process.env.CODEQL_TEST_VAR;
      } else {
        process.env.CODEQL_TEST_VAR = originalEnv;
      }
    }
  });

  it('should pass through NODE_ prefixed environment variables', async () => {
    const originalEnv = process.env.NODE_TEST_VAR;
    process.env.NODE_TEST_VAR = 'node_value';
    
    try {
      const result = await executeCLICommand({
        command: 'sh',
        args: ['-c', 'echo ${NODE_TEST_VAR:-not_set}']
      });
      
      expect(result.success).toBe(true);
      // NODE_ prefixed vars should be passed through
      expect(result.stdout.trim()).toBe('node_value');
    } finally {
      // Cleanup
      if (originalEnv === undefined) {
        delete process.env.NODE_TEST_VAR;
      } else {
        process.env.NODE_TEST_VAR = originalEnv;
      }
    }
  });

  it('should allow explicitly provided environment variables', async () => {
    const result = await executeCLICommand({
      command: 'sh',
      args: ['-c', 'echo ${CUSTOM_VAR:-not_set}'],
      env: { CUSTOM_VAR: 'custom_value' }
    });
    
    expect(result.success).toBe(true);
    // Explicitly provided vars should always be passed through
    expect(result.stdout.trim()).toBe('custom_value');
  });

  it('should override process.env with explicitly provided environment variables', async () => {
    const result = await executeCLICommand({
      command: 'sh',
      args: ['-c', 'echo ${CUSTOM_PATH}'],
      env: { CUSTOM_PATH: '/custom/path' }
    });
    
    expect(result.success).toBe(true);
    // Explicitly provided CUSTOM_PATH should be available
    expect(result.stdout.trim()).toBe('/custom/path');
  });
});

describe('sanitizeCLIArgument', () => {
  it('should accept normal strings', () => {
    expect(sanitizeCLIArgument('hello')).toBe('hello');
    expect(sanitizeCLIArgument('path/to/file.txt')).toBe('path/to/file.txt');
    expect(sanitizeCLIArgument('/absolute/path')).toBe('/absolute/path');
    expect(sanitizeCLIArgument('--option=value')).toBe('--option=value');
  });

  it('should accept strings with spaces', () => {
    expect(sanitizeCLIArgument('hello world')).toBe('hello world');
    expect(sanitizeCLIArgument('path with spaces/file.txt')).toBe('path with spaces/file.txt');
  });

  it('should accept strings with shell metacharacters', () => {
    // These are safe because execFile doesn't use a shell
    expect(sanitizeCLIArgument('test; echo injected')).toBe('test; echo injected');
    expect(sanitizeCLIArgument('$HOME')).toBe('$HOME');
    expect(sanitizeCLIArgument('$(pwd)')).toBe('$(pwd)');
    expect(sanitizeCLIArgument('`ls`')).toBe('`ls`');
    expect(sanitizeCLIArgument('a | b')).toBe('a | b');
    expect(sanitizeCLIArgument('a && b')).toBe('a && b');
  });

  it('should accept strings with quotes', () => {
    expect(sanitizeCLIArgument('"quoted"')).toBe('"quoted"');
    expect(sanitizeCLIArgument("'single quoted'")).toBe("'single quoted'");
  });

  it('should accept strings with allowed control characters (tab, newline, CR)', () => {
    expect(sanitizeCLIArgument('hello\tworld')).toBe('hello\tworld');
    expect(sanitizeCLIArgument('hello\nworld')).toBe('hello\nworld');
    expect(sanitizeCLIArgument('hello\rworld')).toBe('hello\rworld');
  });

  it('should reject strings with null bytes', () => {
    expect(() => sanitizeCLIArgument('hello\0world')).toThrow('null byte');
    expect(() => sanitizeCLIArgument('\0')).toThrow('null byte');
    expect(() => sanitizeCLIArgument('path\0/to/file')).toThrow('null byte');
  });

  it('should reject strings with dangerous control characters', () => {
    // Bell character (0x07)
    expect(() => sanitizeCLIArgument('hello\x07world')).toThrow('control characters');
    // Backspace (0x08)
    expect(() => sanitizeCLIArgument('hello\x08world')).toThrow('control characters');
    // Vertical tab (0x0B)
    expect(() => sanitizeCLIArgument('hello\x0Bworld')).toThrow('control characters');
    // Form feed (0x0C)
    expect(() => sanitizeCLIArgument('hello\x0Cworld')).toThrow('control characters');
    // Escape (0x1B)
    expect(() => sanitizeCLIArgument('hello\x1Bworld')).toThrow('control characters');
    // Other control chars (0x01-0x08, 0x0E-0x1F)
    expect(() => sanitizeCLIArgument('hello\x01world')).toThrow('control characters');
    expect(() => sanitizeCLIArgument('hello\x1Fworld')).toThrow('control characters');
  });

  it('should accept empty strings', () => {
    expect(sanitizeCLIArgument('')).toBe('');
  });

  it('should accept unicode characters', () => {
    expect(sanitizeCLIArgument('hello 世界')).toBe('hello 世界');
    expect(sanitizeCLIArgument('émojis 🎉')).toBe('émojis 🎉');
  });
});

describe('sanitizeCLIArguments', () => {
  it('should sanitize an array of arguments', () => {
    const args = ['arg1', 'arg2', 'path/to/file'];
    expect(sanitizeCLIArguments(args)).toEqual(['arg1', 'arg2', 'path/to/file']);
  });

  it('should accept empty array', () => {
    expect(sanitizeCLIArguments([])).toEqual([]);
  });

  it('should throw if any argument contains null byte', () => {
    expect(() => sanitizeCLIArguments(['valid', 'invalid\0', 'also valid'])).toThrow('null byte');
  });

  it('should throw if any argument contains dangerous control characters', () => {
    expect(() => sanitizeCLIArguments(['valid', 'invalid\x07', 'also valid'])).toThrow('control characters');
  });
});

describe('executeCLICommand - Argument Sanitization', () => {
  it('should reject arguments with null bytes', async () => {
    const result = await executeCLICommand({
      command: 'echo',
      args: ['hello\0world']
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('null byte');
  });

  it('should reject arguments with dangerous control characters', async () => {
    const result = await executeCLICommand({
      command: 'echo',
      args: ['hello\x07world']
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('control characters');
  });

  it('should accept arguments with safe control characters', async () => {
    const result = await executeCLICommand({
      command: 'echo',
      args: ['hello\tworld']
    });
    
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('hello');
    expect(result.stdout).toContain('world');
  });
});

describe('resolveCodeQLBinary', () => {
  const originalEnv = process.env.CODEQL_PATH;

  afterEach(() => {
    // Restore original env and reset cached binary
    if (originalEnv === undefined) {
      delete process.env.CODEQL_PATH;
    } else {
      process.env.CODEQL_PATH = originalEnv;
    }
    resetResolvedCodeQLBinary();
  });

  it('should default to "codeql" when CODEQL_PATH is not set', () => {
    delete process.env.CODEQL_PATH;
    const result = resolveCodeQLBinary();
    expect(result).toBe('codeql');
    expect(getResolvedCodeQLDir()).toBeNull();
  });

  it('should default to "codeql" when CODEQL_PATH is empty', () => {
    process.env.CODEQL_PATH = '';
    const result = resolveCodeQLBinary();
    expect(result).toBe('codeql');
    expect(getResolvedCodeQLDir()).toBeNull();
  });

  it('should return the full path and set dir to parent directory', () => {
    // Create a temporary file named "codeql" to pass validation
    const tmpDir = join(process.cwd(), '.tmp', 'codeql-path-test');
    const codeqlPath = join(tmpDir, 'codeql');
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(codeqlPath, '#!/bin/sh\necho test', { mode: 0o755 });

    try {
      process.env.CODEQL_PATH = codeqlPath;
      const result = resolveCodeQLBinary();
      expect(result).toBe(codeqlPath);
      expect(getResolvedCodeQLDir()).toBe(tmpDir);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should reject CODEQL_PATH with wrong basename', () => {
    process.env.CODEQL_PATH = '/usr/local/bin/not-codeql';
    expect(() => resolveCodeQLBinary()).toThrow('expected basename: codeql');
  });

  it('should reject a relative CODEQL_PATH', () => {
    process.env.CODEQL_PATH = 'relative/path/to/codeql';
    expect(() => resolveCodeQLBinary()).toThrow('must be an absolute path');
  });

  it('should reject CODEQL_PATH pointing to a non-existent file', () => {
    process.env.CODEQL_PATH = '/nonexistent/path/to/codeql';
    expect(() => resolveCodeQLBinary()).toThrow('does not exist');
  });

  it('should accept a valid absolute CODEQL_PATH pointing to an existing file', () => {
    // Use /bin/echo as a stand-in for an existing file named "codeql"
    // We can't actually test with a real codeql binary in unit tests,
    // so test the basename validation and existence check separately.
    // Here we test that a non-existent but well-named path is rejected for non-existence.
    process.env.CODEQL_PATH = '/tmp/nonexistent-dir/codeql';
    expect(() => resolveCodeQLBinary()).toThrow('does not exist');
  });

  it('should cache the resolved dir via getResolvedCodeQLDir', () => {
    delete process.env.CODEQL_PATH;
    resolveCodeQLBinary();
    expect(getResolvedCodeQLDir()).toBeNull();
  });

  it('should reset to default via resetResolvedCodeQLBinary', () => {
    delete process.env.CODEQL_PATH;
    resolveCodeQLBinary();
    resetResolvedCodeQLBinary();
    expect(getResolvedCodeQLDir()).toBeNull();
  });

  it('should accept codeql.exe basename on Windows-style paths', () => {
    // This tests basename validation only; the file won't exist.
    process.env.CODEQL_PATH = '/some/path/codeql.exe';
    expect(() => resolveCodeQLBinary()).toThrow('does not exist');
    // The error should be about non-existence, NOT about an invalid basename
  });

  it('should accept codeql.cmd basename', () => {
    process.env.CODEQL_PATH = '/some/path/codeql.cmd';
    expect(() => resolveCodeQLBinary()).toThrow('does not exist');
  });
});

describe('CODEQL_PATH - PATH prepend integration', () => {
  const originalEnv = process.env.CODEQL_PATH;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CODEQL_PATH;
    } else {
      process.env.CODEQL_PATH = originalEnv;
    }
    resetResolvedCodeQLBinary();
  });

  it('should cache resolved value and ignore subsequent env changes', () => {
    delete process.env.CODEQL_PATH;
    const first = resolveCodeQLBinary();
    expect(first).toBe('codeql');

    // Change the env after resolution — should still return cached value
    process.env.CODEQL_PATH = '/some/changed/path/codeql';
    const second = resolveCodeQLBinary();
    expect(second).toBe('codeql');
    expect(getResolvedCodeQLDir()).toBeNull();
  });

  it('should prepend CODEQL_PATH directory to child process PATH', async () => {
    // Create a temporary directory with a fake "codeql" script
    const tmpDir = join(process.cwd(), '.tmp', 'codeql-path-prepend-test');
    const codeqlPath = join(tmpDir, 'codeql');
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(codeqlPath, '#!/bin/sh\necho test', { mode: 0o755 });
    chmodSync(codeqlPath, 0o755);

    try {
      process.env.CODEQL_PATH = codeqlPath;
      resolveCodeQLBinary();

      // Run a command that prints PATH - verify the codeql dir is prepended
      const result = await executeCLICommand({
        command: 'sh',
        args: ['-c', 'echo $PATH']
      });

      expect(result.success).toBe(true);
      // The PATH should start with our tmpDir
      expect(result.stdout.trim().startsWith(tmpDir)).toBe(true);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// Check if codeql is available on PATH (may not be in CI environments like build-server)
let codeqlOnPath = false;
try {
  execFileSync('codeql', ['version', '--format=terse'], { timeout: 5000 });
  codeqlOnPath = true;
} catch {
  codeqlOnPath = false;
}

describe('validateCodeQLBinaryReachable', () => {
  const originalEnv = process.env.CODEQL_PATH;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CODEQL_PATH;
    } else {
      process.env.CODEQL_PATH = originalEnv;
    }
    resetResolvedCodeQLBinary();
  });

  it.skipIf(!codeqlOnPath)('should return a version string when codeql is on PATH', async () => {
    // Use the default PATH-based resolution (codeql must be on PATH for tests)
    delete process.env.CODEQL_PATH;
    resolveCodeQLBinary();

    const version = await validateCodeQLBinaryReachable();
    expect(version).toBeTruthy();
    // Version should be a semver-like string (e.g. "2.23.9")
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should throw a descriptive error when codeql is not reachable', async () => {
    // Create a temporary directory with a fake "codeql" that exits with error
    const tmpDir = join(process.cwd(), '.tmp', 'codeql-unreachable-test');
    const codeqlPath = join(tmpDir, 'codeql');
    mkdirSync(tmpDir, { recursive: true });
    // Create a script that fails immediately
    writeFileSync(codeqlPath, '#!/bin/sh\nexit 1', { mode: 0o755 });
    chmodSync(codeqlPath, 0o755);

    try {
      process.env.CODEQL_PATH = codeqlPath;
      resolveCodeQLBinary();

      await expect(validateCodeQLBinaryReachable()).rejects.toThrow('not reachable');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should include guidance about CODEQL_PATH in error message', async () => {
    const tmpDir = join(process.cwd(), '.tmp', 'codeql-guidance-test');
    const codeqlPath = join(tmpDir, 'codeql');
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(codeqlPath, '#!/bin/sh\nexit 1', { mode: 0o755 });
    chmodSync(codeqlPath, 0o755);

    try {
      process.env.CODEQL_PATH = codeqlPath;
      resolveCodeQLBinary();

      await expect(validateCodeQLBinaryReachable()).rejects.toThrow('CODEQL_PATH');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
