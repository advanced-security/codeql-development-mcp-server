/**
 * MCP Client Utilities
 * Shared utility functions for MCP client operations
 */

/* global setTimeout */

import { restartServer } from "./server-manager.js";

/**
 * Connect to server with automatic retry on "already initialized" error
 * @param {Object} client - CodeQLMCPClient instance
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<boolean>} True if connected successfully
 */
export async function connectWithRetry(client, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await client.connect();
      return true;
    } catch (error) {
      if (
        error.message &&
        error.message.includes("Server already initialized") &&
        attempt < maxRetries
      ) {
        console.error("Server session conflict detected, restarting server...");
        await restartServer();
        // Wait for server to be ready
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      throw error;
    }
  }
  return false;
}
