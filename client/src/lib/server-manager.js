/**
 * Server management module for starting and stopping the MCP server
 */

/* global setTimeout */

import { spawn } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync, createWriteStream } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLIENT_DIR = join(__dirname, "..", "..");
const ROOT_DIR = join(CLIENT_DIR, "..");
const PID_FILE = join(CLIENT_DIR, "server.pid");
const LOG_FILE = join(CLIENT_DIR, "server.log");

/**
 * Check if the server is currently running
 * @returns {boolean} True if server is running
 */
export function isServerRunning() {
  if (!existsSync(PID_FILE)) {
    return false;
  }

  try {
    const pid = parseInt(readFileSync(PID_FILE, "utf8").trim());
    // Check if process is running
    process.kill(pid, 0);
    return true;
  } catch {
    // Process not found or no permission
    return false;
  }
}

/**
 * Start the MCP server
 * @param {Object} options - Server options
 * @param {string} options.mode - Transport mode: 'stdio' or 'http'
 * @param {string} options.host - HTTP host (only for http mode)
 * @param {number} options.port - HTTP port (only for http mode)
 * @param {string} options.scheme - HTTP scheme (only for http mode)
 * @returns {Promise<number>} Server PID
 */
export async function startServer(options = {}) {
  const { mode = "http", host = "localhost", port = 3000, scheme = "http" } = options;

  // Check if server is already running
  if (isServerRunning()) {
    const pid = parseInt(readFileSync(PID_FILE, "utf8").trim());
    console.error(`Server is already running with PID ${pid}`);
    return pid;
  }

  console.error(`Starting MCP server in ${mode} mode...`);

  const env = {
    ...process.env,
    TRANSPORT_MODE: mode
  };

  if (mode === "http") {
    env.HTTP_HOST = host;
    env.HTTP_PORT = port.toString();
    env.HTTP_SCHEME = scheme;
  }

  const serverPath = join(ROOT_DIR, "server", "dist", "ql-mcp-server.js");

  // Start server as detached process
  const serverProcess = spawn("node", [serverPath], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env,
    cwd: ROOT_DIR
  });

  // Append logs to file (preserves logs from previous runs).
  // WARNING: This can lead to unbounded log file growth.
  // Consider implementing log rotation or a cleanup strategy to manage log file size.
  const logStream = createWriteStream(LOG_FILE, { flags: "a" });

  // Add separator and timestamp for new server session
  const timestamp = new Date().toISOString();
  logStream.write(`\n${"=".repeat(80)}\n`);
  logStream.write(`[${timestamp}] Starting MCP server (PID: ${serverProcess.pid})\n`);
  logStream.write(`${"=".repeat(80)}\n\n`);

  serverProcess.stdout.pipe(logStream);
  serverProcess.stderr.pipe(logStream);

  // Save PID
  writeFileSync(PID_FILE, serverProcess.pid.toString());

  // Unref so parent can exit
  serverProcess.unref();

  console.error(`Server started with PID ${serverProcess.pid}`);
  console.error(`Logs will be appended to ${LOG_FILE}`);

  // Wait a bit for server to start
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return serverProcess.pid;
}

/**
 * Stop the MCP server
 * @returns {Promise<boolean>} True if server was stopped
 */
export async function stopServer() {
  if (!existsSync(PID_FILE)) {
    console.error("No server.pid file found");
    return false;
  }

  const pid = parseInt(readFileSync(PID_FILE, "utf8").trim());
  console.error(`Stopping server with PID ${pid}`);

  try {
    // Try graceful shutdown
    process.kill(pid, "SIGTERM");

    // Wait for process to exit
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check if still running
    try {
      process.kill(pid, 0);
      // Still running, force kill
      console.error("Force killing server process");
      process.kill(pid, "SIGKILL");
    } catch {
      // Process already stopped
    }

    console.error("Server stopped successfully");
  } catch (error) {
    if (error.code === "ESRCH") {
      console.error("Server process was not running");
    } else {
      throw error;
    }
  } finally {
    // Clean up PID file only (preserve logs for debugging)
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }
  }

  return true;
}

/**
 * Restart the MCP server
 * @param {Object} options - Server options
 * @returns {Promise<number>} Server PID
 */
export async function restartServer(options = {}) {
  console.error("Restarting MCP server...");
  await stopServer();
  // Wait a bit for port to be released
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return await startServer(options);
}

/**
 * Ensure server is running, start if needed
 * @param {Object} options - Server options
 * @param {boolean} options.fresh - If true, restart server even if running
 * @returns {Promise<void>}
 */
export async function ensureServerRunning(options = {}) {
  if (options.fresh) {
    console.error("Fresh server requested, restarting...");
    await restartServer(options);
  } else if (!isServerRunning()) {
    console.error("Server not running, starting automatically...");
    await startServer(options);
  }
}
