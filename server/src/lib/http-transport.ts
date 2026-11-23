import express, { type Express } from 'express';
import { logger } from '../utils/logger';

/**
 * HTTP is a local, native-client transport, not a browser or remote-access API.
 */
export function createLocalHttpApp(): Express {
  const app = express();
  app.use((req, res, next) => {
    const port = req.socket.localPort;
    const authorities = ['127.0.0.1', '[::1]', 'localhost'].flatMap((host) =>
      port === 80 ? [host, `${host}:80`] : [`${host}:${port}`],
    );
    const hostCount = req.rawHeaders.filter((_, index) =>
      index % 2 === 0 && req.rawHeaders[index].toLowerCase() === 'host',
    ).length;

    // Match the wire authority exactly; URL parsing can normalize malformed
    // authorities, and forwarded headers must not widen this trust boundary.
    let error: string | undefined;
    if (!port || hostCount !== 1 || !authorities.includes(req.headers.host ?? '')) {
      error = 'Invalid Host header: only this loopback listener is allowed';
    } else if (req.headers.origin !== undefined || req.headers['sec-fetch-site'] !== undefined) {
      error = 'Browser requests are not supported by the local HTTP transport';
    }

    if (error) {
      logger.warn(`Rejected HTTP request: ${error}`);
      res.status(403).json({ jsonrpc: '2.0', error: { code: -32000, message: error }, id: null });
      return;
    }
    next();
  });
  app.use(express.json());
  return app;
}

export function getHttpConfiguration(
  env: Partial<Record<'HTTP_HOST' | 'HTTP_PORT' | 'PORT', string>> = process.env,
): { host: string; port: number } {
  const host = env.HTTP_HOST ?? 'localhost';
  const port = env.HTTP_PORT ?? env.PORT ?? '3000';
  if (!['127.0.0.1', '::1', 'localhost'].includes(host)) {
    throw new Error('HTTP_HOST must be localhost, 127.0.0.1, or ::1; remote HTTP access is not supported');
  }
  if (!/^[0-9]+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error('HTTP_PORT (or PORT) must be an integer between 1 and 65535');
  }
  // Bind a literal loopback address rather than trusting DNS for localhost.
  return { host: host === 'localhost' ? '127.0.0.1' : host, port: Number(port) };
}
