/**
 * Integration tests for bundled markdown link validity.
 *
 * Walks every `.md` file under the installed extension's bundled chat
 * customization dirs (`agents/`, `prompts/`, `skills/`) and asserts that every
 * relative markdown link target resolves to a file or directory that actually
 * exists inside the extension's bundle. External URLs and bare anchors are
 * skipped.
 *
 * Broken links in shipped content mislead LLMs and users: agents and skills
 * reference these supporting files at runtime, and a stale link silently fails.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';
const BUNDLED_DIRS = ['agents', 'prompts', 'skills'] as const;

// Match `[label](target)` markdown links. Lazy on label, greedy-but-paren-safe
// on target. Anchors and angle-bracket forms are handled in the iteration.
const LINK_RE = /\[(?:[^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;

interface LinkRef {
  file: string;
  line: number;
  target: string;
  resolved: string;
}

function* walkMarkdown(root: string): Generator<string> {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) {
      yield* walkMarkdown(full);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      yield full;
    }
  }
}

function extractRelativeLinks(filePath: string, extensionRoot: string): LinkRef[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const refs: LinkRef[] = [];
  let inFence = false;
  let fenceMarker = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Track fenced code blocks (``` or ~~~). Links inside fences are sample
    // output, not real navigation targets — skip them.
    const fenceMatch = /^(\s*)(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[2];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
        continue;
      } else if (marker.startsWith(fenceMarker[0]) && marker.length >= fenceMarker.length) {
        inFence = false;
        fenceMarker = '';
        continue;
      }
    }
    if (inFence) continue;

    let m: RegExpExecArray | null;
    LINK_RE.lastIndex = 0;
    while ((m = LINK_RE.exec(line)) !== null) {
      const raw = m[1];
      // Strip fragments and queries.
      const stripped = raw.replace(/[?#].*$/, '');
      if (!stripped) continue;
      // External / non-filesystem links.
      if (/^[a-z][a-z0-9+.-]*:/i.test(stripped)) continue; // http:, https:, mailto:, codeql:, vscode:
      if (stripped.startsWith('//')) continue; // protocol-relative
      // Resolve against the markdown file's directory.
      const dir = path.dirname(filePath);
      const resolved = path.resolve(dir, stripped);
      // Reject if resolution escapes the extension root.
      const rel = path.relative(extensionRoot, resolved);
      if (rel.startsWith('..')) {
        refs.push({ file: filePath, line: i + 1, target: raw, resolved: `<outside extension: ${resolved}>` });
        continue;
      }
      refs.push({ file: filePath, line: i + 1, target: raw, resolved });
    }
  }
  return refs;
}

suite('Bundled markdown link validity', () => {
  let extensionPath: string;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    if (!ext.isActive) {
      await ext.activate();
    }
    extensionPath = ext.extensionPath;
  });

  test('every relative link in bundled agents/prompts/skills markdown resolves to a bundled file', () => {
    const broken: LinkRef[] = [];
    let scanned = 0;

    for (const dirName of BUNDLED_DIRS) {
      const dir = path.join(extensionPath, dirName);
      for (const md of walkMarkdown(dir)) {
        const refs = extractRelativeLinks(md, extensionPath);
        for (const ref of refs) {
          scanned++;
          if (ref.resolved.startsWith('<outside extension:')) {
            broken.push(ref);
            continue;
          }
          if (!fs.existsSync(ref.resolved)) {
            broken.push(ref);
          }
        }
      }
    }

    if (broken.length > 0) {
      const summary = broken
        .map((r) => `  ${path.relative(extensionPath, r.file)}:${r.line}  →  ${r.target}`)
        .join('\n');
      assert.fail(
        `Found ${broken.length} broken markdown link(s) (scanned ${scanned}):\n${summary}`,
      );
    }
  });
});
