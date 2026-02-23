import { build } from 'esbuild';
import { chmod, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const distDir = 'dist';
const entryFile = 'src/codeql-development-mcp-server.ts';
const outFile = 'dist/codeql-development-mcp-server.js';

// Ensure dist directory exists
if (!existsSync(distDir)) {
  await mkdir(distDir, { recursive: true });
}

const config = {
  entryPoints: [entryFile],
  bundle: true,
  outfile: outFile,
  format: 'esm',
  platform: 'node',
  target: 'node24',
  sourcemap: true,
  loader: {
    // Embed .prompt.md files as string literals so they are available
    // at runtime without filesystem access (npm, VSIX, bundled layouts).
    '.md': 'text',
  },
  banner: {
    // createRequire shim lets bundled CJS packages (e.g., express) call
    // require() for Node.js built-ins inside the ESM output.
    js: [
      '#!/usr/bin/env node',
      'import { createRequire as __bundled_createRequire__ } from "module";',
      'const require = __bundled_createRequire__(import.meta.url);',
    ].join('\n'),
  },
  // Only generate the bundled JS file and source map
  write: true,
  metafile: false,
  splitting: false
};

build(config)
  .then(async () => {
    // Make the bundled file executable
    await chmod(outFile, 0o755);
    console.log('✅ Build completed successfully');
    console.log(`📦 Generated: ${outFile}`);
    console.log(`🗺️ Generated: ${outFile}.map`);
  })
  .catch((error) => {
    console.error('❌ Build failed:', error);
    process.exit(1);
  });
