/**
 * Type declarations for non-TypeScript module imports.
 *
 * esbuild's `loader: { '.md': 'text' }` configuration inlines `.md` files
 * as default-exported strings. These declarations let TypeScript accept
 * `import content from './file.md'` without errors.
 */
declare module '*.md' {
  const content: string;
  export default content;
}
