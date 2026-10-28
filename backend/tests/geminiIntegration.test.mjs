import test from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/test';
process.env.JWT_SECRET ||= 'x'.repeat(40);
process.env.ENCRYPTION_KEY ||= 'e'.repeat(40);
process.env.VAULT_ENCRYPTION_KEY ||= 'v'.repeat(40);

import config from '../src/config/config.js';
import HttpError from '../src/utils/httpError.utils.js';
import { catalogFor, PLATFORM_ONLY_PROVIDERS, getCatalogEntry } from '../src/features/integrationHub/integrationHub.catalog.js';
import hub from '../src/features/integrationHub/integrationHub.service.js';
import repo from '../src/features/integrationHub/integrationHub.repository.js';
import auditLogService from '../src/features/auditLog/auditLog.services.js';
import geminiHandler, { _setInjectedFetch } from '../src/features/integrationHub/utils/providers/gemini.handler.js';
import { verifyProviderConnection } from '../src/features/integrationHub/utils/providers/index.js';
import aiAssistantService, {
  setFetchImplementation,
  setIntegrationHubService,
} from '../src/features/aiAssistant/aiAssistant.service.js';

const ORG = '507f1f77bcf86cd799439011';
const PLATFORM_ORG = '507f1f77bcf86cd7994399aa';
const USER = '507f1f77bcf86cd7994390a1';
const CONN_ID = '507f1f77bcf86cd7994390c1';

function stub(target, impls) {
  const orig = {};
  for (const [k, v] of Object.entries(impls)) {
    orig[k] = target[k];
    target[k] = v;
  }
  return () => Object.assign(target, orig);
}

// -------------------------------------------------------------
// Suite 1: Gemini Provider Handler Tests
// -------------------------------------------------------------

test('1. Gemini Handler: Rejects missing API key', async () => {
  await assert.rejects(
    geminiHandler.verify({}),
    /API Key \(apiKey\) is required for Google Gemini integration/
  );
  await assert.rejects(
    geminiHandler.verify({ apiKey: '   ' }),
    /API Key \(apiKey\) is required for Google Gemini integration/
  );
});

test('2. Gemini Handler: Successful validation against upstream endpoint', async () => {
  let calledUrl = '';
  _setInjectedFetch(async (url) => {
    calledUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        name: 'models/gemini-3.8-live',
        supportedGenerationMethods: ['bidiGenerateContent', 'generateContent'],
      }),
    };
  });

  try {
    const res = await geminiHandler.verify({
      apiKey: 'AIzaSyFakeKey123',
      model: 'gemini-3.8-live',
    });
    assert.equal(res, true);
    assert.ok(calledUrl.includes('models/gemini-3.8-live'));
    assert.ok(calledUrl.includes('key=AIzaSyFakeKey123'));
  } finally {
    _setInjectedFetch(null);
  }
});

test('3. Gemini Handler: Invalid API key reports sanitized error without leaking key', async () => {
  _setInjectedFetch(async () => ({
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    json: async () => ({
      error: { message: 'API key not valid. Please pass a valid API key=SECRET_KEY_REDACTED_CHECK.' },
    }),
  }));

  try {
    await assert.rejects(
      geminiHandler.verify({ apiKey: 'SECRET_KEY_CHECK_123', model: 'gemini-3.8-live' }),
      (err) => {
        assert.match(err.message, /Invalid Gemini API credentials/i);
        assert.ok(!err.message.includes('SECRET_KEY_CHECK_123'), 'Never leaks raw API key');
        return true;
      }
    );
  } finally {
    _setInjectedFetch(null);
  }
});

test('4. Gemini Handler: Unsupported model rejects with descriptive error', async () => {
  _setInjectedFetch(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      name: 'models/gemini-text-only',
      supportedGenerationMethods: ['generateContent'], // lacks bidiGenerateContent
    }),
  }));

  try {
    await assert.rejects(
      geminiHandler.verify({ apiKey: 'valid-key', model: 'gemini-text-only' }),
      /does not advertise Live bidirectional audio capability/i
    );
  } finally {
    _setInjectedFetch(null);
  }
});

test('5. Gemini Handler: Upstream network timeout triggers safe failure', async () => {
  _setInjectedFetch(async () => {
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    throw err;
  });

  try {
    await assert.rejects(
      geminiHandler.verify({ apiKey: 'valid-key' }),
      /verification timed out after 6 seconds/i
    );
  } finally {
    _setInjectedFetch(null);
  }
});

// -------------------------------------------------------------
// Suite 2: Integration Hub Catalog & Storage Tests
// -------------------------------------------------------------

test('6. Catalog: Gemini is registered under scope:platform and AI category', () => {
  const entry = getCatalogEntry('gemini');
  assert.ok(entry, 'Gemini must exist in catalog');
  assert.equal(entry.category, 'AI');
  assert.equal(entry.scope, 'platform');
  assert.ok(PLATFORM_ONLY_PROVIDERS.includes('gemini'));

  const communityCatalog = catalogFor({ isPlatform: false }).map((p) => p.id);
  assert.ok(!communityCatalog.includes('gemini'), 'Gemini must be hidden from normal community admins');

  const platformCatalog = catalogFor({ isPlatform: true }).map((p) => p.id);
  assert.ok(platformCatalog.includes('gemini'), 'Gemini must be visible to platform admins');

  const apiKeyField = entry.fields.find((f) => f.name === 'apiKey');
  assert.equal(apiKeyField?.type, 'password', 'apiKey must be password type');
  assert.equal(apiKeyField?.required, true, 'apiKey must be required');
});

test('7. Hub Security: Community admin cannot connect Gemini (403)', async () => {
  await assert.rejects(
    hub.connect(USER, ORG, 'gemini', 'Community Voice', { apiKey: 'fake-key' }, { isPlatform: false }),
    (err) => err.statusCode === 403
  );
});

test('8. Hub Security: Platform admin can connect Gemini, secrets are encrypted and masked', async () => {
  let storedDoc = null;
  const restore = [
    stub(repo, {
      upsertConnection: async (userId, orgId, provider, label, credentials) => {
        storedDoc = { provider, label, credentials };
        return { _id: CONN_ID, provider, accountLabel: label, status: 'connected', credentials };
      },
    }),
    stub(auditLogService, { logEvent: async () => {} }),
  ];

  // Mock upstream verify for gemini
  _setInjectedFetch(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      name: 'models/gemini-3.8-live',
      supportedGenerationMethods: ['bidiGenerateContent'],
    }),
  }));

  try {
    const res = await hub.connect(
      USER,
      PLATFORM_ORG,
      'gemini',
      'Platform Gemini Assistant',
      {
        apiKey: 'AIzaSySecretMasterKey',
        model: 'gemini-3.8-live',
        sessionDurationSec: '240',
        maxDailySessions: '10',
        junkField: 'ignoreMe',
      },
      { isPlatform: true }
    );

    assert.equal(res.provider, 'gemini');
    assert.equal(res.accountLabel, 'Platform Gemini Assistant');
    assert.deepEqual(res.configuredKeys.sort(), ['apiKey', 'maxDailySessions', 'model', 'sessionDurationSec']);
    // Secrets never returned in output
    assert.equal(res.apiKey, undefined);

    // Verify stored in DB encrypted
    assert.ok(storedDoc.credentials.every((c) => c.authTag && c.encryptedValue !== 'AIzaSySecretMasterKey'));
  } finally {
    restore.forEach((r) => r());
    _setInjectedFetch(null);
  }
});

test('9. Hub Strategy: verifyProviderConnection dispatches to gemini handler', async () => {
  _setInjectedFetch(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      name: 'models/gemini-3.8-live',
      supportedGenerationMethods: ['bidiGenerateContent'],
    }),
  }));

  try {
    const ok = await verifyProviderConnection('gemini', { apiKey: 'AIzaSyValid' });
    assert.equal(ok, true);
  } finally {
    _setInjectedFetch(null);
  }
});

// -------------------------------------------------------------
// Suite 3: AI Assistant Precedence & Kill-Switch Tests
// -------------------------------------------------------------

test('10. AI Assistant Precedence: Uses DB connection when configured', async () => {
  const mockHub = {
    getGlobalConnectionByProvider: async (provider) => {
      if (provider === 'gemini') {
        return {
          _id: CONN_ID,
          provider: 'gemini',
          status: 'connected',
          credentials: [],
        };
      }
      return null;
    },
    decryptAll: () => ({
      apiKey: 'AIzaSyFromDatabase999',
      model: 'gemini-3.8-live',
      sessionDurationSec: 300,
      maxDailySessions: 8,
    }),
  };

  setIntegrationHubService(mockHub);
  try {
    const runtime = await aiAssistantService.resolveRuntimeConfig();
    assert.equal(runtime.enabled, true);
    assert.equal(runtime.source, 'database');
    assert.equal(runtime.apiKey, 'AIzaSyFromDatabase999');
    assert.equal(runtime.sessionDurationSec, 300);
    assert.equal(runtime.maxDailySessions, 8);
  } finally {
    setIntegrationHubService(null);
  }
});

test('11. AI Assistant Precedence: Falls back to environment when no DB connection exists', async () => {
  const mockHub = {
    getGlobalConnectionByProvider: async () => null,
  };

  config.aiAssistant.enabled = true;
  config.aiAssistant.geminiApiKey = 'AIzaSyFromEnvironment123';
  config.aiAssistant.geminiModel = 'gemini-3.8-live';

  setIntegrationHubService(mockHub);
  try {
    const runtime = await aiAssistantService.resolveRuntimeConfig();
    assert.equal(runtime.enabled, true);
    assert.equal(runtime.source, 'environment');
    assert.equal(runtime.apiKey, 'AIzaSyFromEnvironment123');
  } finally {
    setIntegrationHubService(null);
  }
});

test('12. AI Assistant Precedence: Fails closed when DB connection is disconnected (no fallback)', async () => {
  const mockHub = {
    getGlobalConnectionByProvider: async () => ({
      _id: CONN_ID,
      provider: 'gemini',
      status: 'disconnected', // DB admin disabled it!
      credentials: [],
    }),
  };

  config.aiAssistant.enabled = true;
  config.aiAssistant.geminiApiKey = 'AIzaSyFromEnvironment123'; // Environment key exists!

  setIntegrationHubService(mockHub);
  try {
    const runtime = await aiAssistantService.resolveRuntimeConfig();
    assert.equal(runtime.enabled, false);
    assert.equal(runtime.disabledByDb, true);
    assert.equal(runtime.apiKey, null, 'Must NOT use environment key when DB connection is disconnected');

    // Trying to create a session token must be rejected with 503
    await assert.rejects(
      aiAssistantService.createSessionToken({ id: USER }, { orgId: ORG }),
      (err) => err.statusCode === 503 && /disabled in system settings/i.test(err.message)
    );
  } finally {
    setIntegrationHubService(null);
  }
});

test('13. Global Kill Switch: Rejects sessions regardless of DB or environment config', async () => {
  const mockHub = {
    getGlobalConnectionByProvider: async () => ({
      _id: CONN_ID,
      provider: 'gemini',
      status: 'connected',
      credentials: [],
    }),
    decryptAll: () => ({ apiKey: 'valid-db-key' }),
  };

  config.aiAssistant.enabled = false; // Master kill switch active!

  setIntegrationHubService(mockHub);
  try {
    const runtime = await aiAssistantService.resolveRuntimeConfig();
    assert.equal(runtime.enabled, false);
    assert.equal(runtime.killSwitched, true);

    await assert.rejects(
      aiAssistantService.createSessionToken({ id: USER }, { orgId: ORG }),
      (err) => err.statusCode === 503 && /currently disabled/i.test(err.message)
    );
  } finally {
    config.aiAssistant.enabled = true;
    setIntegrationHubService(null);
  }
});

test('14. Session Token Flow: Live endpoint & ephemeral token with DB-backed model', async () => {
  const mockHub = {
    getGlobalConnectionByProvider: async () => ({
      _id: CONN_ID,
      provider: 'gemini',
      status: 'connected',
      credentials: [],
    }),
    decryptAll: () => ({
      apiKey: 'valid-db-key',
      model: 'gemini-3.8-live',
      sessionDurationSec: 200,
    }),
  };

  let tokenRequestHeaders = null;
  let tokenRequestBody = null;

  setIntegrationHubService(mockHub);
  setFetchImplementation(async (url, opts) => {
    tokenRequestHeaders = opts.headers;
    tokenRequestBody = JSON.parse(opts.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        name: 'auth_tokens/ephemeral-token-xyz-789',
        expireTime: new Date(Date.now() + 200 * 1000).toISOString(),
      }),
    };
  });

  try {
    const result = await aiAssistantService.createSessionToken(
      { id: USER, orgId: ORG, permissions: ['visitor:resident'] },
      { orgId: ORG, permissions: ['visitor:resident'] }
    );

    assert.equal(result.token, 'auth_tokens/ephemeral-token-xyz-789');
    assert.equal(result.model, 'gemini-3.8-live');
    assert.equal(result.sessionDurationSec, 200);
    assert.equal(tokenRequestHeaders['x-goog-api-key'], 'valid-db-key');
    assert.equal(tokenRequestBody.uses, 1);
    assert.ok(tokenRequestBody.expireTime);
    assert.ok(result.authorizedFeatures.some((f) => f.id === 'visitor_resident_passes'));
  } finally {
    setFetchImplementation(null);
    setIntegrationHubService(null);
  }
});
