/**
 * Tests for database-resolver — database path resolution and metadata parsing.
 */

import { describe, expect, it } from 'vitest';
import { parseDatabaseYmlContent } from '../../../src/lib/database-resolver';

describe('parseDatabaseYmlContent', () => {
  it('should extract primaryLanguage', () => {
    const content = `---
sourceLocationPrefix: /src
primaryLanguage: javascript
creationMetadata:
  cliVersion: 2.25.1
`;
    const metadata = parseDatabaseYmlContent(content);
    expect(metadata.language).toBe('javascript');
  });

  it('should extract sourceLocationPrefix', () => {
    const content = `sourceLocationPrefix: /Users/dev/project
primaryLanguage: python
`;
    const metadata = parseDatabaseYmlContent(content);
    expect(metadata.sourceLocationPrefix).toBe('/Users/dev/project');
  });

  it('should extract cliVersion', () => {
    const content = `primaryLanguage: java
cliVersion: 2.20.4
creationTime: 2026-03-31T12:00:00Z
`;
    const metadata = parseDatabaseYmlContent(content);
    expect(metadata.cliVersion).toBe('2.20.4');
  });

  it('should extract creationTime', () => {
    const content = `primaryLanguage: cpp
creationTime: 2026-03-31T12:00:00Z
`;
    const metadata = parseDatabaseYmlContent(content);
    expect(metadata.creationTime).toBe('2026-03-31T12:00:00Z');
  });

  it('should strip quotes from values', () => {
    const content = `primaryLanguage: "javascript"
sourceLocationPrefix: '/src/project'
`;
    const metadata = parseDatabaseYmlContent(content);
    expect(metadata.language).toBe('javascript');
    expect(metadata.sourceLocationPrefix).toBe('/src/project');
  });

  it('should return empty object for empty content', () => {
    const metadata = parseDatabaseYmlContent('');
    expect(metadata).toEqual({});
  });

  it('should handle content without recognized keys', () => {
    const content = `unknownKey: someValue
anotherKey: anotherValue
`;
    const metadata = parseDatabaseYmlContent(content);
    expect(metadata).toEqual({});
  });

  it('should handle multiple languages in realistic YAML', () => {
    const content = `---
sourceLocationPrefix: /Users/data-douser/Git/project
baselineLinesOfCode: 12345
unicodeNewlines: true
columnKind: utf16
primaryLanguage: javascript
creationMetadata:
  sha: abc123
  cliVersion: 2.25.1
  creationTime: 2026-03-31T12:00:00.000Z
`;
    const metadata = parseDatabaseYmlContent(content);
    expect(metadata.language).toBe('javascript');
    expect(metadata.sourceLocationPrefix).toBe('/Users/data-douser/Git/project');
  });
});
