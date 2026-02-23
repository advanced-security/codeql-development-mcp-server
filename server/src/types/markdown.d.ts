/**
 * Type declarations for non-TypeScript module imports.
 *
 * esbuild's `loader: { '.md': 'text' }` configuration inlines `.md` files
 * as default-exported strings. This declaration lets TypeScript accept
 * `import content from './file.prompt.md'` without errors.
 */
declare module '*.prompt.md' {
  const content: string;
  export default content;
}
