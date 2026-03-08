/**
 * Integration tests for MCP server resource endpoints.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * They spawn the actual `ql-mcp` server process, connect via
 * StdioClientTransport, list all resources, and read each one to verify
 * that no resource returns fallback "not found" content.
 *
 * This test suite exists to catch the class of bugs where:
 * - Resource files are configured with wrong paths (e.g. `ql/languages/<lang>/` vs `ql/<lang>/`)
 * - Resource content is not embedded in the bundle (esbuild `.md: 'text'` loader misconfigured)
 * - Resource file extensions are wrong (e.g. `.prompt.md` vs `.md`)
 *
 * These bugs manifest in VS Code as: Command Palette → "MCP: Browse Resources..."
 * → selecting any ql-mcp resource → seeing "Resource file not found or could not be loaded."
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';

/** Sentinel text returned when a language resource file cannot be loaded. */
const NOT_FOUND_SENTINEL = 'Resource file not found or could not be loaded';

/** Extract text from a readResource content item (text or blob union). */
function extractText(item: { uri: string; text?: string; blob?: string }): string {
  return (item as { text?: string }).text ?? '';
}

/**
 * Resolve the MCP server entry point.
 */
function resolveServerPath(): string {
  const extPath = vscode.extensions.getExtension(EXTENSION_ID)?.extensionUri.fsPath;
  if (!extPath) throw new Error('Extension not found');

  const monorepo = path.resolve(extPath, '..', '..', 'server', 'dist', 'codeql-development-mcp-server.js');
  try {
    fs.accessSync(monorepo);
    return monorepo;
  } catch {
    // Fall through
  }

  const vsix = path.resolve(extPath, 'server', 'dist', 'codeql-development-mcp-server.js');
  try {
    fs.accessSync(vsix);
    return vsix;
  } catch {
    throw new Error(`MCP server not found at ${monorepo} or ${vsix}`);
  }
}

suite('MCP Resource Integration Tests', () => {
  let client: Client;
  let transport: StdioClientTransport;

  suiteSetup(async function () {
    this.timeout(30_000);

    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    if (!ext.isActive) await ext.activate();

    const serverPath = resolveServerPath();

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      TRANSPORT_MODE: 'stdio',
    };

    transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env,
      stderr: 'pipe',
    });

    client = new Client({ name: 'resource-integration-test', version: '1.0.0' });
    await client.connect(transport);
    console.log('[mcp-resource-e2e] Connected to MCP server');
  });

  suiteTeardown(async function () {
    this.timeout(10_000);
    try { if (client) await client.close(); } catch { /* best-effort */ }
    try { if (transport) await transport.close(); } catch { /* best-effort */ }
  });

  test('Server should list resources', async function () {
    this.timeout(15_000);

    const response = await client.listResources();
    assert.ok(response.resources, 'Server should return resources');
    assert.ok(response.resources.length > 0, 'Server should have at least one resource');

    console.log(`[mcp-resource-e2e] Server provides ${response.resources.length} resources`);
  });

  test('Static resources should return non-empty content', async function () {
    this.timeout(30_000);

    const response = await client.listResources();
    const staticUris = response.resources
      .map(r => r.uri)
      .filter(uri => uri.startsWith('codeql://server/') || uri.startsWith('codeql://templates/') || uri.startsWith('codeql://patterns/') || uri.startsWith('codeql://learning/'));

    assert.ok(staticUris.length > 0, 'Should have at least one static resource');

    for (const uri of staticUris) {
      const result = await client.readResource({ uri });
      const text = extractText(result.contents?.[0] ?? { uri });
      assert.ok(
        text.length > 0,
        `Static resource ${uri} returned empty content`,
      );
      assert.ok(
        !text.includes(NOT_FOUND_SENTINEL),
        `Static resource ${uri} returned fallback "not found" content`,
      );
    }
  });

  test('Language-specific resources should return actual content, not fallback', async function () {
    this.timeout(60_000);

    const response = await client.listResources();
    const langUris = response.resources
      .map(r => r.uri)
      .filter(uri => uri.startsWith('codeql://languages/'));

    // If no language resources are listed, the registration-time existence check
    // correctly filtered them out (which is acceptable). But if they ARE listed,
    // they MUST return real content.
    if (langUris.length === 0) {
      console.log('[mcp-resource-e2e] No language resources registered (files may be missing in this layout)');
      return;
    }

    console.log(`[mcp-resource-e2e] Found ${langUris.length} language-specific resources`);

    for (const uri of langUris) {
      const result = await client.readResource({ uri });
      const text = extractText(result.contents?.[0] ?? { uri });

      assert.ok(
        text.length > 100,
        `Language resource ${uri} returned suspiciously short content (${text.length} chars)`,
      );

      assert.ok(
        !text.includes(NOT_FOUND_SENTINEL),
        `Language resource ${uri} returned fallback "not found" content. ` +
        `This means the resource content was not embedded at build time. ` +
        `Check LANGUAGE_RESOURCES in language-types.ts and ensure the ` +
        `corresponding .md file exists under server/src/resources/languages/.`,
      );
    }

    console.log(`[mcp-resource-e2e] All ${langUris.length} language resources returned real content`);
  });

  test('Every listed resource should be readable without error', async function () {
    this.timeout(60_000);

    const response = await client.listResources();

    for (const resource of response.resources) {
      const result = await client.readResource({ uri: resource.uri });
      const text = extractText(result.contents?.[0] ?? { uri: resource.uri });

      assert.ok(
        text.length > 0,
        `Resource "${resource.name}" (${resource.uri}) returned empty content`,
      );

      assert.ok(
        !text.includes(NOT_FOUND_SENTINEL),
        `Resource "${resource.name}" (${resource.uri}) returned fallback "not found" content`,
      );
    }

    console.log(`[mcp-resource-e2e] All ${response.resources.length} resources are readable`);
  });

  test('No resource content should contain YAML frontmatter', async function () {
    this.timeout(60_000);

    const response = await client.listResources();

    for (const resource of response.resources) {
      const result = await client.readResource({ uri: resource.uri });
      const text = extractText(result.contents?.[0] ?? { uri: resource.uri });

      assert.ok(
        !text.startsWith('---'),
        `Resource "${resource.name}" (${resource.uri}) starts with YAML frontmatter. ` +
        `Resources are not prompts and should not contain prompt metadata.`,
      );
    }

    console.log(`[mcp-resource-e2e] No resources contain YAML frontmatter`);
  });
});
