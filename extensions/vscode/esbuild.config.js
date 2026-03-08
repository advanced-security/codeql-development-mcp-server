import { build, context } from 'esbuild';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';

const distDir = 'dist';

// Ensure dist directory exists
if (!existsSync(distDir)) {
  await mkdir(distDir, { recursive: true });
}

const shared = {
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node22',
  sourcemap: true,
  external: ['vscode'],
  write: true,
  metafile: false,
  splitting: false,
};

// Main extension bundle
const extensionConfig = {
  ...shared,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.cjs',
};

// Integration test suite — each file is a separate output so the Mocha
// runner can discover them via glob at runtime.
const testSuiteConfig = {
  ...shared,
  entryPoints: [
    'test/suite/index.ts',
    'test/suite/bridge.integration.test.ts',
    'test/suite/extension.integration.test.ts',
    'test/suite/mcp-resource-e2e.integration.test.ts',
    'test/suite/mcp-server.integration.test.ts',
    'test/suite/mcp-tool-e2e.integration.test.ts',
    'test/suite/workspace-scenario.integration.test.ts',
  ],
  outdir: 'dist/test/suite',
  outfile: undefined, // outdir and outfile are mutually exclusive
  outExtension: { '.js': '.cjs' },
  external: ['vscode'],
  logOverride: {
    'require-resolve-not-external': 'silent',
  },
};

const isWatch = process.argv.includes('--watch');

if (isWatch) {
  const ctx = await context(extensionConfig);
  await ctx.watch();
  console.log('👀 Watching for changes...');
} else {
  try {
    await build(extensionConfig);
    console.log('✅ Extension build completed successfully');
    console.log(`📦 Generated: dist/extension.cjs`);

    await build(testSuiteConfig);
    console.log('✅ Test suite build completed successfully');
    console.log(`📦 Generated: dist/test/suite/*.cjs`);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}
