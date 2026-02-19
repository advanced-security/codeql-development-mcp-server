/**
 * bundle-server.js
 *
 * Copies the MCP server bundle, tool query packs, and server package.json
 * into the extension's output directory so the VSIX is self-contained.
 *
 * Run via: npm run bundle:server
 * Called automatically by: vscode:prepublish
 *
 * Resulting layout inside extensions/vscode/:
 *   server/
 *     dist/codeql-development-mcp-server.js      (bundled server)
 *     dist/codeql-development-mcp-server.js.map   (source map)
 *     ql/<lang>/tools/src/                         (tool query packs)
 *     package.json                                 (server package metadata)
 */

import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionRoot = resolve(__dirname, '..');
const serverRoot = resolve(extensionRoot, '..', '..', 'server');
const targetServerDir = join(extensionRoot, 'server');

// Languages with tool query packs
const LANGUAGES = [
  'actions', 'cpp', 'csharp', 'go', 'java',
  'javascript', 'python', 'ruby', 'swift',
];

// Clean previous bundle
if (existsSync(targetServerDir)) {
  rmSync(targetServerDir, { recursive: true, force: true });
}

// --- Server dist (JS only, no source maps) ---
const serverDist = join(serverRoot, 'dist');
const targetDist = join(targetServerDir, 'dist');
if (!existsSync(serverDist)) {
  console.error('❌ Server dist/ not found. Run "npm run build -w server" first.');
  process.exit(1);
}
mkdirSync(targetDist, { recursive: true });
// Copy only the JS bundle, not the source map (which contains ../../ paths
// that cause vsce to traverse the entire monorepo)
const serverJs = join(serverDist, 'codeql-development-mcp-server.js');
cpSync(serverJs, join(targetDist, 'codeql-development-mcp-server.js'));
console.log('✅ Copied server/dist/codeql-development-mcp-server.js');

// --- Server package.json ---
const serverPkg = join(serverRoot, 'package.json');
cpSync(serverPkg, join(targetServerDir, 'package.json'));
console.log('✅ Copied server/package.json');

// --- Tool query packs (ql/<lang>/tools/src/) ---
for (const lang of LANGUAGES) {
  const srcDir = join(serverRoot, 'ql', lang, 'tools', 'src');
  if (!existsSync(srcDir)) {
    console.warn(`⚠️  Skipping ql/${lang}/tools/src/ (not found)`);
    continue;
  }
  const targetDir = join(targetServerDir, 'ql', lang, 'tools', 'src');
  mkdirSync(targetDir, { recursive: true });
  cpSync(srcDir, targetDir, { recursive: true });
  console.log(`✅ Copied ql/${lang}/tools/src/`);
}

console.log('');
console.log('🎉 Server bundle complete. The extension VSIX will be self-contained.');
