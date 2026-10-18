import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

// The Express application validates these settings when it is imported. These are
// non-production test values; no database connection is opened by this route test.
process.env.NODE_ENV = 'test';
process.env.ALLOW_MOCK_PAYMENTS = 'false';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/nahom_sample_route_test';
process.env.JWT_SECRET = 'test-only-jwt-secret-not-for-production';
process.env.SESSION_SECRET = 'test-only-session-secret-not-for-production';
process.env.ENCRYPTION_KEY = 'test-only-encryption-key-not-for-production';
process.env.JWT_REFRESH_SECRET = 'test-only-refresh-secret-not-for-production';
process.env.VAULT_ENCRYPTION_KEY = 'test-only-vault-key-not-for-production';

let server;
let baseUrl;

before(async () => {
  const { default: app } = await import('../index.js');
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

describe('sample API is not exposed', () => {
  for (const basePath of ['/api/sample', '/api/v1/sample']) {
    for (const [method, suffix, authenticated] of [
      ['GET', '', false],
      ['POST', '', false],
      ['PUT', '/507f1f77bcf86cd799439011', true],
      ['DELETE', '/507f1f77bcf86cd799439011', true],
    ]) {
      it(`${method} ${basePath}${suffix} returns 404${authenticated ? ' with an Authorization header' : ' without authentication'}`, async () => {
        const response = await fetch(`${baseUrl}${basePath}${suffix}`, {
          method,
          headers: {
            'content-type': 'application/json',
            ...(authenticated ? { authorization: 'Bearer deliberately-invalid-test-token' } : {}),
          },
          body: ['POST', 'PUT'].includes(method) ? JSON.stringify({ title: 'test sample' }) : undefined,
        });

        assert.equal(response.status, 404);
      });
    }
  }
});
