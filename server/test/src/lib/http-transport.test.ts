import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { request, type Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalHttpApp, getHttpConfiguration } from '../../../src/lib/http-transport';

describe('getHttpConfiguration', () => {
  it('defaults to numeric loopback without consulting DNS', () => {
    expect(getHttpConfiguration({})).toEqual({ host: '127.0.0.1', port: 3000 });
    expect(getHttpConfiguration({ HTTP_HOST: 'localhost' }).host).toBe('127.0.0.1');
  });

  it('preserves explicit IPv4 and IPv6 loopback and port precedence', () => {
    expect(getHttpConfiguration({ HTTP_HOST: '::1', HTTP_PORT: '3100', PORT: '3200' }))
      .toEqual({ host: '::1', port: 3100 });
    expect(getHttpConfiguration({ HTTP_HOST: '127.0.0.1', PORT: '3200' }))
      .toEqual({ host: '127.0.0.1', port: 3200 });
  });

  it.each(['', '0.0.0.0', '::', '192.168.1.1', 'example.com', 'localhost.example', '127.1', '[::1]'])(
    'rejects unsupported bind address %j',
    (host) => expect(() => getHttpConfiguration({ HTTP_HOST: host })).toThrow('HTTP_HOST'),
  );

  it.each(['', '0', '-1', '65536', '3000.5', '3e3', 'NaN', ' 3000'])(
    'rejects invalid port %j instead of falling back silently',
    (port) => expect(() => getHttpConfiguration({ HTTP_PORT: port })).toThrow('HTTP_PORT'),
  );
});

describe('local HTTP boundary', () => {
  let httpServer: Server | undefined;
  let mcp: McpServer | undefined;
  let port: number;
  const toolCall = vi.fn(() => ({ content: [{ type: 'text' as const, text: 'ok' }] }));
  const initialize = {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } },
  };

  async function start() {
    const app = createLocalHttpApp();
    mcp = new McpServer({ name: 'test', version: '1' });
    mcp.registerTool('probe', {}, toolCall);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: randomUUID });
    await mcp.connect(transport);
    app.all('/mcp', (req, res) => {
      transport.handleRequest(req, res, req.body).catch((error: unknown) => {
        res.status(500).json({ error: String(error) });
      });
    });
    app.get('/', (_req, res) => res.json({ status: 'running' }));
    httpServer = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      httpServer?.once('listening', resolve);
      httpServer?.once('error', reject);
    });
    const address = httpServer.address();
    if (!address || typeof address === 'string') throw new Error('Missing test listener address');
    port = address.port;
    toolCall.mockClear();
  }

  async function send(
    headers: string[] = [],
    body: unknown = initialize,
    method = 'POST',
    path = '/mcp',
  ) {
    return new Promise<{ status: number; headers: import('node:http').IncomingHttpHeaders; body: string }>((resolve, reject) => {
      const data = typeof body === 'string' ? body : JSON.stringify(body);
      const req = request({
        host: '127.0.0.1', port, path, method,
        headers: [
          ...headers,
          'Accept', 'application/json, text/event-stream',
          'Content-Type', 'application/json',
          'Content-Length', String(Buffer.byteLength(data)),
        ],
      }, (res) => {
        let response = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => { response += chunk; });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: response }));
      });
      req.on('error', reject);
      req.end(data);
    });
  }

  afterEach(async () => {
    await mcp?.close();
    if (httpServer) {
      httpServer.closeAllConnections();
      await new Promise<void>((resolve, reject) => httpServer?.close((error) => error ? reject(error) : resolve()));
    }
    httpServer = undefined;
    mcp = undefined;
  });

  it.each(['localhost', '127.0.0.1', '[::1]'])('allows native MCP clients using %s', async (hostname) => {
    await start();
    const headers = ['Host', `${hostname}:${port}`];
    const result = await send(headers);
    expect(result.status).toBe(200);
    expect(result.headers['access-control-allow-origin']).toBeUndefined();
    const session = result.headers['mcp-session-id'];
    expect(typeof session).toBe('string');
    if (typeof session !== 'string') throw new Error('Missing MCP session');
    headers.push('Mcp-Session-Id', session);
    expect((await send(headers, { jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202);
    expect((await send(headers, {
      jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'probe', arguments: {} },
    })).status).toBe(200);
    expect(toolCall).toHaveBeenCalledOnce();
  });

  it.each([
    'attacker.example:PORT', 'localhost.attacker.example:PORT', 'localhost:1',
    '127.0.0.1', 'localhost:PORT@attacker.example', 'attacker.example@localhost:PORT',
    'localhost:PORT/path', 'localhost:PORT#fragment', 'localhost:PORT,attacker.example',
  ])('rejects hostile or malformed Host %s before parsing JSON', async (host) => {
    await start();
    const result = await send(['Host', host.replaceAll('PORT', String(port))], '{');
    expect(result.status).toBe(403);
    expect(result.headers['access-control-allow-origin']).toBeUndefined();
    expect(toolCall).not.toHaveBeenCalled();
  });

  it('rejects missing and duplicate Host headers', async () => {
    await start();
    for (const headers of [[], ['Host', `localhost:${port}`, 'Host', 'attacker.example']]) {
      // Node versions may reject malformed HTTP before Express sees it.
      expect([400, 403]).toContain((await send(headers)).status);
    }
    expect(toolCall).not.toHaveBeenCalled();
  });

  it.each(['', 'null', 'http://attacker.example', 'http://localhost:PORT', 'https://localhost:PORT'])(
    'rejects every browser Origin %j even with a valid session',
    async (origin) => {
      await start();
      const host = ['Host', `localhost:${port}`];
      const initialized = await send(host);
      const session = initialized.headers['mcp-session-id'];
      if (typeof session !== 'string') throw new Error('Missing MCP session');
      const result = await send([...host, 'Origin', origin.replaceAll('PORT', String(port)), 'Mcp-Session-Id', session], {
        jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'probe', arguments: {} },
      });
      expect(result.status).toBe(403);
      expect(toolCall).not.toHaveBeenCalled();
    },
  );

  it.each(['GET', 'POST', 'DELETE', 'OPTIONS'])('guards %s on every route, including health', async (method) => {
    await start();
    for (const path of ['/', '/mcp', '/unknown']) {
      const response = await send(['Host', `localhost:${port}`, 'Origin', 'http://attacker.example'], '', method, path);
      expect(response.status).toBe(403);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    }
  });

  it.each(['cross-site', 'same-site', 'same-origin', 'none'])('rejects originless browser requests with Sec-Fetch-Site %s', async (site) => {
    await start();
    expect((await send(['Host', `localhost:${port}`, 'Sec-Fetch-Site', site], '', 'GET', '/')).status).toBe(403);
  });

  it('allows Node fetch-based clients, which send Sec-Fetch-Mode but no Origin or Sec-Fetch-Site', async () => {
    await start();
    const result = await send(['Host', `localhost:${port}`, 'Sec-Fetch-Mode', 'cors']);
    expect(result.status).toBe(200);
  });

  it('does not trust forwarded headers to authorize a remote Host', async () => {
    await start();
    expect((await send([
      'Host', 'attacker.example',
      'X-Forwarded-Host', `localhost:${port}`,
      'Forwarded', `host=localhost:${port};for=127.0.0.1`,
    ])).status).toBe(403);
  });

  it('leaves the session available after rejected initialization attempts', async () => {
    await start();
    expect((await send(['Host', 'attacker.example'])).status).toBe(403);
    expect((await send(['Host', `localhost:${port}`, 'Origin', 'null'])).status).toBe(403);
    expect((await send(['Host', `localhost:${port}`])).status).toBe(200);
  });
});
