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
  external: [
    '@modelcontextprotocol/sdk',
    'express',
    'cors',
    'dotenv',
    'zod'
  ],
  banner: {
    js: '#!/usr/bin/env node'
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
