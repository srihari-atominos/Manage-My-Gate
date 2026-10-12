import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';

process.env.NODE_ENV = 'production';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/nahom_phase5_test';
process.env.JWT_SECRET = 'a'.repeat(40);
process.env.SESSION_SECRET = 'b'.repeat(40);
process.env.ENCRYPTION_KEY = 'c'.repeat(40);
process.env.JWT_REFRESH_SECRET = 'd'.repeat(40);
process.env.VAULT_ENCRYPTION_KEY = 'e'.repeat(40);
process.env.ALLOWED_ORIGINS = 'https://managemygate.e3esg.com,https://app.managemygate.com';
process.env.CLIENT_URL = 'https://managemygate.e3esg.com';

let server;
let baseUrl;

before(async () => {
  const { default: app } = await import('../index.js');
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

describe('Phase 5 — Security Configuration, Headers, and CORS Policy', () => {
  it('sends Content-Security-Policy and security headers on HTTP responses', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const csp = res.headers.get('content-security-policy');
    const xContentType = res.headers.get('x-content-type-options');
    const xFrameOptions = res.headers.get('x-frame-options');

    assert.ok(csp, 'Response must include Content-Security-Policy header');
    assert.match(csp, /default-src 'self'/, 'CSP must enforce default-src self');
    assert.match(csp, /object-src 'none'/, 'CSP must block object-src');
    assert.equal(xContentType, 'nosniff', 'Must include nosniff');
    assert.equal(xFrameOptions, 'SAMEORIGIN', 'Must restrict frame embedding');
  });

  it('restricts CORS in production to configured allowed origins and rejects untrusted origins', async () => {
    // Untrusted cross-origin request
    const untrustedRes = await fetch(`${baseUrl}/health`, {
      headers: {
        Origin: 'https://malicious-attacker.com',
      },
    });
    assert.equal(untrustedRes.headers.get('access-control-allow-origin'), null, 'Untrusted origin must not receive Access-Control-Allow-Origin');

    // Trusted origin request
    const trustedRes = await fetch(`${baseUrl}/health`, {
      headers: {
        Origin: 'https://managemygate.e3esg.com',
      },
    });
    assert.equal(trustedRes.headers.get('access-control-allow-origin'), 'https://managemygate.e3esg.com');
    assert.equal(trustedRes.headers.get('access-control-allow-credentials'), 'true');
  });

  it('does not include local development origins in production CORS allowlist', async () => {
    const { config } = await import('../src/config/config.js');
    assert.ok(!config.cors.allowedOrigins.includes('http://localhost:3000'), 'Production CORS allowlist must not include localhost:3000');
    assert.ok(!config.cors.allowedOrigins.includes('http://127.0.0.1:5173'), 'Production CORS allowlist must not include 127.0.0.1:5173');
    assert.ok(config.cors.allowedOrigins.includes('https://managemygate.e3esg.com'), 'Must contain production allowed origin');
  });

  it('safe handling for non-browser requests without Origin header', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    // When no origin is sent, CORS does not attach wildcard with credentials
    assert.notEqual(res.headers.get('access-control-allow-origin'), '*');
  });
});
