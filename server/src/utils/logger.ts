/**
 * Simple logger utility.
 *
 * All log output is written to stderr. In stdio transport mode, stdout is
 * reserved exclusively for the MCP JSON-RPC protocol — any non-protocol
 * bytes on stdout would corrupt the message stream.
 */
export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.error(`[INFO] ${new Date().toISOString()} ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.error(`[WARN] ${new Date().toISOString()} ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.DEBUG) {
      console.error(`[DEBUG] ${new Date().toISOString()} ${message}`, ...args);
    }
  },
};
