import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../index.js';
import mongoose from 'mongoose';
import { signToken } from '../src/utils/jwt.utils.js';

describe('OWASP A01: Upload Access Authorization & Path Traversal Verification', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  test('1. Unauthenticated request to private uploads returns 404 (prevents file enumeration)', async () => {
    const res = await fetch(`${baseUrl}/uploads/invoices/receipt_123.pdf`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  test('2. Path traversal attack with encoded ../ returns 404', async () => {
    const res = await fetch(`${baseUrl}/uploads/invoices/..%2f..%2fpackage.json`);
    assert.strictEqual(res.status, 404);
  });

  test('3. Issue report screenshots are never served statically', async () => {
    const res = await fetch(`${baseUrl}/uploads/issueReports/screenshot.png`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });
});
