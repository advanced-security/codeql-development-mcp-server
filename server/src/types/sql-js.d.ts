/**
 * Type declarations for the sql.js asm.js build.
 *
 * We import `sql.js/dist/sql-asm.js` (pure JS, no WASM binary) so the
 * entire SQLite engine bundles inline with esbuild.  This module is a
 * CJS UMD export that doesn't ship its own `.d.ts`, so we declare the
 * minimal types here.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'sql.js/dist/sql-asm.js' {
  function initSqlJs(): Promise<any>;
  export default initSqlJs;
}

declare module 'sql.js' {
  export interface Database {
    run(..._args: any[]): void;
    exec(..._args: any[]): { columns: string[]; values: unknown[][] }[];
    prepare(..._args: any[]): {
      bind(..._args: any[]): boolean;
      step(): boolean;
      getAsObject(): Record<string, unknown>;
      free(): boolean;
    };
    export(): Uint8Array;
    close(): void;
  }
}

