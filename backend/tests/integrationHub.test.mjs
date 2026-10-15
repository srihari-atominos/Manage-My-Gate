import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);
process.env.ENCRYPTION_KEY ||= 'e'.repeat(40);
process.env.VAULT_ENCRYPTION_KEY ||= 'v'.repeat(40);

const hub = (await import('../src/features/integrationHub/integrationHub.service.js')).default;
const repo = (await import('../src/features/integrationHub/integrationHub.repository.js')).default;
const IntegrationHub = (await import('../src/features/integrationHub/integrationHub.model.js')).default;
const { catalogFor, PLATFORM_ONLY_PROVIDERS } = await import('../src/features/integrationHub/integrationHub.catalog.js');
const { assertPublicHost } = await import('../src/features/integrationHub/utils/providers/smtp.handler.js');
const auditLogService = (await import('../src/features/auditLog/auditLog.services.js')).default;

const ORG = '507f1f77bcf86cd799439011';
const PLATFORM_ORG = '507f1f77bcf86cd7994399aa';
const USER = '507f1f77bcf86cd7994390a1';
const CONN = '507f1f77bcf86cd7994390c1';

function stub(target, impls) {
  const orig = {};
  for (const [k, v] of Object.entries(impls)) {
    orig[k] = target[k];
    target[k] = v;
  }
  return () => Object.assign(target, orig);
}

const bank = { accountName: 'Green Park RWA', accountNumber: '123456789012', ifscCode: 'SBIN0001234' };

test('catalog: communities never see or get platform-level providers', () => {
  const community = catalogFor({ isPlatform: false }).map((p) => p.id);
  const platform = catalogFor({ isPlatform: true }).map((p) => p.id);
  for (const id of ['firebase', 'twilio', 'messagecentral', 'msg91', 'resend']) {
    assert.ok(PLATFORM_ONLY_PROVIDERS.includes(id));
    assert.ok(!community.includes(id), `${id} must be hidden from communities`);
    assert.ok(platform.includes(id));
  }
  assert.ok(community.includes('razorpay') && community.includes('smtp') && community.includes('banking'));
  assert.ok(catalogFor({}).every((p) => p.description && p.icon && p.category && p.fields.length > 0));
});

test('connect: a community admin cannot configure a platform-level provider', async () => {
  await assert.rejects(
    hub.connect(USER, ORG, 'twilio', 'My Twilio', { accountSid: 'AC1', authToken: 'x' }, { isPlatform: false }),
    (e) => e.statusCode === 403
  );
  await assert.rejects(
    hub.connect(USER, ORG, 'resend', 'Mine', { apiKey: 'k' }, { isPlatform: false }),
    (e) => e.statusCode === 403
  );
});

test('connect: stores only the known fields, encrypted, and never returns secrets', async () => {
  let stored = null;
  const audits = [];
  const restore = [
    stub(repo, {
      upsertConnection: async (userId, orgId, provider, label, credentials) => {
        stored = { provider, label, credentials };
        return { _id: CONN, provider, accountLabel: label, status: 'connected', credentials };
      },
    }),
    stub(auditLogService, { logEvent: async (e) => audits.push(e) }),
  ];
  try {
    const out = await hub.connect(USER, ORG, 'banking', 'Main account', { ...bank, junk: 'drop-me', evil: '$where' });
    assert.deepEqual(stored.credentials.map((c) => c.key).sort(), ['accountName', 'accountNumber', 'ifscCode']);
    assert.ok(stored.credentials.every((c) => c.authTag && c.encryptedValue !== bank[c.key]), 'values are encrypted (GCM)');
    assert.equal('credentials' in out, false);
    assert.deepEqual(out.configuredKeys.sort(), ['accountName', 'accountNumber', 'ifscCode']);
    assert.equal(JSON.stringify(audits).includes('123456789012'), false, 'audit entries never contain secret values');
    assert.equal(audits[0].metadata.provider, 'banking');
  } finally {
    restore.forEach((r) => r());
  }
});

function existingBank() {
  return {
    _id: CONN,
    orgId: ORG,
    provider: 'banking',
    accountLabel: 'Main account',
    status: 'connected',
    credentials: hub.encryptAll(bank),
  };
}

test('update: rotating one field keeps the others, is verified, and is re-encrypted', async () => {
  let patch = null;
  const restore = [
    stub(repo, {
      getConnectionById: async () => existingBank(),
      updateConnection: async (id, orgId, p) => ((patch = p), { ...existingBank(), ...p }),
    }),
    stub(auditLogService, { logEvent: async () => {} }),
  ];
  try {
    await hub.updateConnection(CONN, ORG, { credentials: { accountNumber: '999999999999', accountName: '   ', ifscCode: '' } }, { userId: USER });
    const merged = {};
    for (const c of patch.credentials) merged[c.key] = hub.decryptAll({ credentials: [c] })[c.key];
    assert.deepEqual(merged, { ...bank, accountNumber: '999999999999' }, 'blank fields keep the stored value');
    assert.equal(patch.lastCheck.ok, true);
  } finally {
    restore.forEach((r) => r());
  }
});

test('update: an invalid new value is refused before saving, and an empty request is refused', async () => {
  let saved = false;
  const restore = [
    stub(repo, {
      getConnectionById: async () => existingBank(),
      updateConnection: async () => ((saved = true), existingBank()),
    }),
  ];
  try {
    await assert.rejects(hub.updateConnection(CONN, ORG, { credentials: { ifscCode: 'bad' } }), (e) => e.statusCode === 400);
    await assert.rejects(
      hub.updateConnection(CONN, ORG, { credentials: { accountNumber: '  ' } }),
      (e) => e.statusCode === 400 && /Nothing to update/.test(e.message)
    );
    assert.equal(saved, false);
  } finally {
    restore.forEach((r) => r());
  }
});

test('update/test/delete: a connection of another community is invisible (404)', async () => {
  const restore = [stub(repo, { getConnectionById: async () => null })];
  try {
    await assert.rejects(hub.updateConnection(CONN, ORG, { accountLabel: 'x' }), (e) => e.statusCode === 404);
    await assert.rejects(hub.testConnection(CONN, ORG), (e) => e.statusCode === 404);
    await assert.rejects(hub.deleteConnection(CONN, ORG), (e) => e.statusCode === 404);
  } finally {
    restore.forEach((r) => r());
  }
});

test('test connection records the outcome without switching the integration off', async () => {
  const checks = [];
  const broken = existingBank();
  broken.credentials = hub.encryptAll({ ...bank, ifscCode: 'WRONG' });
  const restore = [
    stub(repo, {
      getConnectionById: async () => broken,
      recordCheck: async (id, orgId, check) => checks.push(check),
      updateConnection: async () => assert.fail('a test must not modify the connection'),
    }),
    stub(auditLogService, { logEvent: async () => {} }),
  ];
  try {
    const bad = await hub.testConnection(CONN, ORG, { userId: USER });
    assert.equal(bad.ok, false);
    assert.match(bad.message, /IFSC/);
    assert.equal(checks[0].ok, false);
  } finally {
    restore.forEach((r) => r());
  }
});

test('platform-level lookups read only the platform organisation', async () => {
  let filter = null;
  const none = stub(repo, { getPlatformOrgIds: async () => [] });
  try {
    assert.equal(await repo.findPlatformConnection('smtp'), null, 'no platform org => nothing is used');
  } finally {
    none();
  }
  const restore = [
    stub(repo, { getPlatformOrgIds: async () => [PLATFORM_ORG] }),
    stub(IntegrationHub, {
      find: (f) => ((filter = f), { sort: () => ({ session: async () => [{ _id: 'p1', provider: 'smtp' }] }) }),
    }),
  ];
  try {
    const conn = await repo.findPlatformConnection('SMTP');
    assert.equal(conn._id, 'p1');
    assert.deepEqual(filter.orgId, { $in: [PLATFORM_ORG] });
    assert.equal(filter.provider, 'smtp');
    assert.equal(filter.status, 'connected');
  } finally {
    restore.forEach((r) => r());
  }
});

test('SMTP verifier refuses internal and loopback addresses', async () => {
  for (const host of ['localhost', '127.0.0.1', '10.0.0.5', '192.168.1.20', '172.16.4.4', '169.254.169.254', '::1']) {
    await assert.rejects(assertPublicHost(host), (e) => /public mail server/.test(e.message), `${host} must be refused`);
  }
  await assertPublicHost('8.8.8.8');
  process.env.ALLOW_PRIVATE_SMTP_HOST = 'true';
  try {
    await assertPublicHost('127.0.0.1');
  } finally {
    delete process.env.ALLOW_PRIVATE_SMTP_HOST;
  }
});

test('every hub route is guarded by a permission check, not just a sign-in', async () => {
  const router = (await import('../src/features/integrationHub/integrationHub.router.js')).default;
  const routes = router.stack.filter((l) => l.route);
  assert.ok(routes.length >= 6);
  for (const layer of routes) {
    // The last handler is the controller; there must be at least one middleware (the permission check) before it.
    assert.ok(layer.route.stack.length >= 2, `${layer.route.path} must have an authorization middleware`);
    assert.notEqual(layer.route.stack[0].handle, layer.route.stack[layer.route.stack.length - 1].handle);
  }
});
