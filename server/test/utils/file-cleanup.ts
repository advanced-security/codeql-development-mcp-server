import { promises as fs } from 'fs';

/**
 * Safely delete a file, ignoring ENOENT errors if the file doesn't exist
 */
export async function safeUnlink(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath);
  } catch (error) {
    // Ignore "file not found" errors, but re-throw other errors
    if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
      throw error;
    }
  }
}
