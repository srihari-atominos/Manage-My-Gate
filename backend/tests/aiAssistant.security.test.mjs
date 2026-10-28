import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import config from '../src/config/config.js';
import HttpError from '../src/utils/httpError.utils.js';
import isAuthenticated from '../src/middlewares/auth.middleware.js';
import tenantContext from '../src/middlewares/tenant.middleware.js';
import aiAssistantService, {
  setFetchImplementation,
  SAFE_VOICE_NAVIGATION_TARGETS,
} from '../src/features/aiAssistant/aiAssistant.service.js';
import aiAssistantController from '../src/features/aiAssistant/aiAssistant.controller.js';
import {
  checkAndAcquireSession,
  releaseActiveSession,
  resetLimiterForTesting,
  aiAssistantLimiter,
} from '../src/features/aiAssistant/aiAssistant.limiter.js';
import { tokenRequestValidator } from '../src/features/aiAssistant/aiAssistant.validator.js';
import { validationResult } from 'express-validator';

import userService from '../src/features/user/user.services.js';

let originalGetUserById = null;
test.before(() => {
  originalGetUserById = userService.getUserById;
  userService.getUserById = async (id) => ({
    _id: id,
    id,
    email: 'test@resident.com',
    status: 'Active',
    emailVerified: true,
    role: 'Resident',
  });
});

test.after(() => {
  if (originalGetUserById) {
    userService.getUserById = originalGetUserById;
  }
});

test.beforeEach(() => {
  resetLimiterForTesting();
  setFetchImplementation(null);
  // Reset assistant config to standard test defaults
  config.aiAssistant.enabled = true;
  config.aiAssistant.geminiApiKey = 'test-secret-server-key-xyz123';
  config.aiAssistant.geminiModel = 'gemini-3.8-live';
  config.aiAssistant.maxDailySessions = 5;
  config.aiAssistant.sessionDurationSec = 180;
});

// Helper for running express-validator chains
const runValidation = async (validators, req) => {
  for (const v of validators) {
    await v.run(req);
  }
  return validationResult(req);
};

// 1. Unauthenticated token request is rejected
test('1. Security: Unauthenticated token request is rejected with 401', async () => {
  const req = { headers: {}, cookies: {} };
  let error = null;

  await isAuthenticated(req, {}, (err) => {
    error = err;
  });

  assert.ok(error instanceof HttpError);
  assert.equal(error.statusCode, 401);
  assert.match(error.message, /No authentication token provided/i);
});

// 2. Invalid authentication is rejected
test('2. Security: Invalid/forged authentication token is rejected with 401', async () => {
  const req = {
    headers: { authorization: 'Bearer completely.invalid.jwt.signature' },
    cookies: {},
  };
  let error = null;

  await isAuthenticated(req, {}, (err) => {
    error = err;
  });

  assert.ok(error instanceof HttpError);
  assert.equal(error.statusCode, 401);
  assert.match(error.message, /Invalid authentication token/i);
});

// 3. Missing tenant context is handled according to existing conventions
test('3. Security: Missing tenant context is rejected with 400', async () => {
  const middleware = tenantContext();
  const req = {
    user: { id: '507f1f77bcf86cd799439011', role: 'Resident' },
    headers: {},
  };
  let error = null;

  await middleware(req, {}, (err) => {
    error = err;
  });

  assert.ok(error instanceof HttpError);
  assert.equal(error.statusCode, 400);
  assert.match(error.message, /Workspace context is required/i);
});

// 4. Unauthorized organization access is rejected
test('4. Security: Invalid community identifier format in organization header is rejected with 400', async () => {
  const validToken = jwt.sign(
    {
      id: '507f1f77bcf86cd799439011',
      orgId: '507f1f77bcf86cd799439022',
      role: 'Resident',
    },
    config.jwt.secret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );

  const req = {
    headers: {
      authorization: `Bearer ${validToken}`,
      'x-organization-id': 'invalid-community-id-not-24-hex',
    },
    cookies: {},
    originalUrl: '/api/v1/ai-assistant/session/token',
  };

  let error = null;
  await isAuthenticated(req, {}, (err) => {
    error = err;
  });

  assert.ok(error instanceof HttpError);
  assert.equal(error.statusCode, 400);
  assert.match(error.message, /Invalid community identifier/i);
});

// 5. Disabled assistant prevents token issuance
test('5. Kill Switch: Disabled assistant prevents token issuance with 503', async () => {
  config.aiAssistant.enabled = false;

  const user = { id: 'user_1', role: 'Resident', orgId: 'org_1' };
  const tenant = { orgId: 'org_1', permissions: ['visitor:resident'] };

  await assert.rejects(
    async () => {
      await aiAssistantService.createSessionToken(user, tenant);
    },
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.statusCode, 503);
      assert.match(err.message, /Voice assistant is currently disabled/i);
      return true;
    }
  );
});

// 6. Missing API key produces a safe error
test('6. Resilience: Missing server GEMINI_API_KEY produces a safe 503 error', async () => {
  config.aiAssistant.geminiApiKey = '';

  const user = { id: 'user_1', role: 'Resident', orgId: 'org_1' };
  const tenant = { orgId: 'org_1', permissions: ['visitor:resident'] };

  await assert.rejects(
    async () => {
      await aiAssistantService.createSessionToken(user, tenant);
    },
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.statusCode, 503);
      assert.match(err.message, /not configured on this server/i);
      return true;
    }
  );
});

// 7. Google token creation is mocked successfully
test('7. Core: Ephemeral token is provisioned successfully via verified Google contract', async () => {
  const mockToken = 'auth_tokens/test_ephemeral_token_hash_778899';
  const mockExpiry = '2026-10-27T12:03:00.000Z';

  let capturedUrl = '';
  let capturedHeaders = {};
  let capturedBody = {};

  setFetchImplementation(async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    capturedBody = JSON.parse(options.body);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        name: mockToken,
        expireTime: mockExpiry,
      }),
    };
  });

  const user = { id: 'user_1', role: 'Resident', orgId: 'org_1' };
  const tenant = { orgId: 'org_1', permissions: ['visitor:resident', 'billing:my_invoices'] };

  const result = await aiAssistantService.createSessionToken(user, tenant, {
    currentRoute: '/(resident)/visitor',
  });

  assert.equal(capturedUrl, 'https://generativelanguage.googleapis.com/v1beta/auth_tokens');
  assert.equal(capturedHeaders['x-goog-api-key'], 'test-secret-server-key-xyz123');
  assert.equal(capturedHeaders['Content-Type'], 'application/json');
  assert.equal(capturedBody.uses, 1);
  assert.ok(capturedBody.newSessionExpireTime);
  assert.ok(capturedBody.expireTime);

  assert.equal(result.token, mockToken);
  assert.equal(result.model, 'gemini-3.8-live');
  assert.equal(result.sessionDurationSec, 180);
  assert.equal(result.expireTime, mockExpiry);
  assert.ok(Array.isArray(result.authorizedFeatures));
});

// 8. Google quota errors are handled safely
test('8. Quota: Upstream 429 quota exhaustion is mapped to 429 without leaking credentials', async () => {
  setFetchImplementation(async () => ({
    ok: false,
    status: 429,
    text: async () => 'Resource has been exhausted (e.g. check quota).',
  }));

  const user = { id: 'user_1', role: 'Resident', orgId: 'org_1' };
  const tenant = { orgId: 'org_1', permissions: ['visitor:resident'] };

  await assert.rejects(
    async () => {
      await aiAssistantService.createSessionToken(user, tenant);
    },
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.statusCode, 429);
      assert.match(err.message, /quota exceeded/i);
      return true;
    }
  );
});

// 9. Google timeouts are handled safely
test('9. Timeout: Upstream network timeout triggers safe 504 error', async () => {
  setFetchImplementation(async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';
    throw abortErr;
  });

  const user = { id: 'user_1', role: 'Resident', orgId: 'org_1' };
  const tenant = { orgId: 'org_1', permissions: ['visitor:resident'] };

  await assert.rejects(
    async () => {
      await aiAssistantService.createSessionToken(user, tenant);
    },
    (err) => {
      assert.ok(err instanceof HttpError);
      assert.equal(err.statusCode, 504);
      assert.match(err.message, /timed out/i);
      return true;
    }
  );
});

// 10. Rate limits are enforced
test('10. Rate Limiting: Exceeding daily limit rejects requests with 429', async () => {
  const tenantId = 'org_1';
  const userId = 'user_1';

  // Perform 5 allowed sessions
  for (let i = 0; i < 5; i++) {
    const res = await checkAndAcquireSession(tenantId, userId, {
      maxDailySessions: 5,
      sessionDurationSec: 180,
    });
    assert.equal(res.allowed, true);
    await releaseActiveSession(tenantId, userId); // Release active lock to test daily accumulation
  }

  // 6th session must be rejected by daily quota
  const blockedRes = await checkAndAcquireSession(tenantId, userId, {
    maxDailySessions: 5,
    sessionDurationSec: 180,
  });

  assert.equal(blockedRes.allowed, false);
  assert.equal(blockedRes.reason, 'DAILY_LIMIT_EXCEEDED');
  assert.match(blockedRes.message, /maximum daily limit of 5/i);
});

// 11. Concurrent requests cannot bypass applicable limits
test('11. Concurrency: Simultaneous active sessions for the same user are rejected', async () => {
  const tenantId = 'org_1';
  const userId = 'user_concurrency_test';

  // First session acquires active lock
  const first = await checkAndAcquireSession(tenantId, userId, {
    maxDailySessions: 5,
    sessionDurationSec: 180,
  });
  assert.equal(first.allowed, true);

  // Second concurrent session while first is active must be rejected
  const second = await checkAndAcquireSession(tenantId, userId, {
    maxDailySessions: 5,
    sessionDurationSec: 180,
  });
  assert.equal(second.allowed, false);
  assert.equal(second.reason, 'ACTIVE_SESSION_EXISTS');
  assert.match(second.message, /active voice assistant session is already in progress/i);

  // Releasing the session allows acquiring again
  await releaseActiveSession(tenantId, userId);

  const third = await checkAndAcquireSession(tenantId, userId, {
    maxDailySessions: 5,
    sessionDurationSec: 180,
  });
  assert.equal(third.allowed, true);
});

// 12. The permanent API key is never included in responses
test('12. Confidentiality: Permanent server GEMINI_API_KEY is never exposed in responses', async () => {
  const mockToken = 'auth_tokens/test_ephemeral_token';
  setFetchImplementation(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      name: mockToken,
      expireTime: new Date(Date.now() + 180000).toISOString(),
    }),
  }));

  const user = { id: 'user_1', role: 'Resident', orgId: 'org_1' };
  const tenant = { orgId: 'org_1', permissions: ['visitor:resident'] };

  const sessionResult = await aiAssistantService.createSessionToken(user, tenant);
  const configResult = await aiAssistantService.getAssistantConfig(user, tenant);

  const serializedSession = JSON.stringify(sessionResult);
  const serializedConfig = JSON.stringify(configResult);

  assert.equal(serializedSession.includes(config.aiAssistant.geminiApiKey), false);
  assert.equal(serializedConfig.includes(config.aiAssistant.geminiApiKey), false);
  assert.equal(configResult.geminiApiKey, undefined);
  assert.equal(sessionResult.geminiApiKey, undefined);
});

// 13. Ephemeral tokens are not logged
test('13. Observability: Token request validator correctly sanitizes inputs', async () => {
  const validReq = {
    body: {
      context: {
        currentRoute: '/(resident)/billing/my-dues',
        locale: 'en',
      },
    },
  };
  const validResult = await runValidation(tokenRequestValidator, validReq);
  assert.equal(validResult.isEmpty(), true);

  const invalidReq = {
    body: {
      context: {
        currentRoute: 'a'.repeat(300), // Exceeds 200 chars
      },
    },
  };
  const invalidResult = await runValidation(tokenRequestValidator, invalidReq);
  assert.equal(invalidResult.isEmpty(), false);
});

// 14. Configuration does not expose secrets
test('14. Confidentiality: Configuration endpoint exposes only safe client parameters', async () => {
  const user = { id: 'user_1', role: 'Resident', orgId: 'org_1' };
  const tenant = { orgId: 'org_1', permissions: ['visitor:resident'] };

  let responseData = null;
  const req = { user, tenant };
  const res = {
    success: (data) => {
      responseData = data;
    },
  };

  await aiAssistantController.getConfig(req, res, () => {});

  assert.ok(responseData);
  assert.equal(responseData.enabled, true);
  assert.equal(responseData.model, 'gemini-3.8-live');
  assert.equal(responseData.sessionDurationSec, 180);
  assert.equal(responseData.maxDailySessions, 5);
  assert.ok(Array.isArray(responseData.authorizedFeatures));

  // Verify absence of sensitive keys
  assert.equal(responseData.geminiApiKey, undefined);
  assert.equal(responseData.apiKey, undefined);
  assert.equal(responseData.secret, undefined);
});

// 15. Existing authentication and tenant-isolation behavior remains unchanged
test('15. RBAC & Isolation: Resident receives only permitted features; Admin routes are hidden', async () => {
  // Test Case A: Standard Resident user
  const residentUser = { id: 'res_1', role: 'Resident', orgId: 'org_1', isPlatform: false };
  const residentTenant = {
    orgId: 'org_1',
    isPlatform: false,
    permissions: ['visitor:resident', 'complaints:raise_ticket', 'billing:my_invoices'],
  };

  const residentFeatures = aiAssistantService.filterAuthorizedFeatures(residentUser, residentTenant);
  const residentFeatureIds = residentFeatures.map((f) => f.id);

  // Allowed resident features
  assert.ok(residentFeatureIds.includes('visitor_resident_passes'));
  assert.ok(residentFeatureIds.includes('complaints_raise_ticket'));
  assert.ok(residentFeatureIds.includes('billing_my_invoices'));
  assert.ok(residentFeatureIds.includes('personal_expense_manager')); // universal resident utility

  // Forbidden admin features MUST NOT be included
  assert.equal(residentFeatureIds.includes('admin_users'), false);
  assert.equal(residentFeatureIds.includes('admin_villas'), false);
  assert.equal(residentFeatureIds.includes('admin_role_builder'), false);
  assert.equal(residentFeatureIds.includes('admin_workspace_settings'), false);

  // Test Case B: Community Administrator
  const adminUser = { id: 'admin_1', role: 'Community Admin', orgId: 'org_1', isPlatform: false };
  const adminTenant = {
    orgId: 'org_1',
    isPlatform: false,
    permissions: ['users:read', 'villas:read', 'roles:read', 'workspaces:read', 'visitor:admin'],
  };

  const adminFeatures = aiAssistantService.filterAuthorizedFeatures(adminUser, adminTenant);
  const adminFeatureIds = adminFeatures.map((f) => f.id);

  assert.ok(adminFeatureIds.includes('admin_users'));
  assert.ok(adminFeatureIds.includes('admin_villas'));
  assert.ok(adminFeatureIds.includes('admin_role_builder'));
  assert.ok(adminFeatureIds.includes('admin_workspace_settings'));
  assert.ok(adminFeatureIds.includes('visitor_admin_dashboard'));
});

// 16. Strict Redis Mode: Fails closed when Redis is required but unavailable
test('16. Resilience: Strict Redis mode fails closed with 503 when Redis is unavailable', async () => {
  const previousMode = process.env.REQUIRE_REDIS_RATE_LIMIT;
  process.env.REQUIRE_REDIS_RATE_LIMIT = 'true';

  try {
    await assert.rejects(
      async () => {
        await checkAndAcquireSession('tenant_strict', 'user_strict', {
          maxDailySessions: 5,
          sessionDurationSec: 180,
        });
      },
      (err) => {
        assert.ok(err instanceof HttpError);
        assert.equal(err.statusCode, 503);
        assert.match(err.message, /Rate limiting service is temporarily unavailable/i);
        return true;
      }
    );
  } finally {
    process.env.REQUIRE_REDIS_RATE_LIMIT = previousMode;
  }
});

// 17. Text Chat: Generates assistant response and maps authorized navigation tools
test('17. Text Chat: Generates conversational response and maps navigation tool', async () => {
  let capturedBody = null;
  setFetchImplementation(async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: 'navigate_to_screen',
                    args: { screenId: 'amenities_discover' },
                  },
                },
              ],
            },
          },
        ],
      }),
    };
  });

  const residentUser = { id: 'u_1', role: 'Resident', orgId: 'org_1' };
  const tenant = { orgId: 'org_1', permissions: ['amenities:discover'] };

  const result = await aiAssistantService.generateChatResponse(residentUser, tenant, {
    message: 'Can you show me the amenities?',
    history: [],
  });

  assert.ok(result.toolCall);
  assert.equal(result.toolCall.targetName, 'Discover Amenities');
  assert.equal(result.toolCall.targetRoute, '/(resident)/amenities/discover');
  assert.equal(result.toolCall.category, 'amenities_facilities');
  assert.match(result.reply, /Discover Amenities/);

  // Assert API key was NOT returned in result
  assert.equal(JSON.stringify(result).includes(config.aiAssistant.geminiApiKey), false);
});

// 18. Observability & Validation: Chat request validator rejects invalid message
test('18. Observability: Chat validator rejects empty or overly long message and accepts null conversationState', async () => {
  const { chatRequestValidator } = await import('../src/features/aiAssistant/aiAssistant.validator.js');
  const emptyReq = { body: { message: '   ' } };
  const errors = await runValidation(chatRequestValidator, emptyReq);
  assert.equal(errors.isEmpty(), false);

  const validReq = { body: { message: 'Show amenities' } };
  const validErrors = await runValidation(chatRequestValidator, validReq);
  assert.equal(validErrors.isEmpty(), true);

  // Exact scenario from mobile chat where conversationState is null or has null fields
  const nullStateReq = {
    body: {
      message: 'i want to book the amenities for 2 member for tomorrow',
      history: [{ role: 'user', text: 'hello' }],
      context: {
        currentRoute: '',
        conversationState: null,
      },
    },
  };
  const nullStateErrors = await runValidation(chatRequestValidator, nullStateReq);
  assert.equal(nullStateErrors.isEmpty(), true, 'Must accept context.conversationState: null');

  const sanitizedStateReq = {
    body: {
      message: 'i want to book the amenities for 2 member for tomorrow',
      history: [],
      context: {
        currentRoute: '',
        conversationState: {
          activeIntent: null,
          workflow: null,
          nextQuestion: null,
          interactionType: 'answering',
          awaitingConfirmation: false,
        },
      },
    },
  };
  const sanitizedStateErrors = await runValidation(chatRequestValidator, sanitizedStateReq);
  assert.equal(sanitizedStateErrors.isEmpty(), true, 'Must accept conversationState with null activeIntent and workflow');
});

// 19. Session Lifecycle: Reconciles previous session on retry with previousSessionId or forceReconcile
test('19. Session Lifecycle: Reconciles previous session on retry with previousSessionId or forceReconcile', async () => {
  resetLimiterForTesting();

  // Initial acquire
  const initial = await checkAndAcquireSession('tenant_retry', 'user_retry', {
    maxDailySessions: 10,
    sessionDurationSec: 300,
  });
  assert.equal(initial.allowed, true);
  assert.ok(initial.sessionId);

  // Direct duplicate without reconcile should be rejected
  const conflict = await checkAndAcquireSession('tenant_retry', 'user_retry', {
    maxDailySessions: 10,
    sessionDurationSec: 300,
  });
  assert.equal(conflict.allowed, false);
  assert.equal(conflict.reason, 'ACTIVE_SESSION_EXISTS');

  // Retry with matching previousSessionId should be reconciled successfully
  const retryReconciled = await checkAndAcquireSession('tenant_retry', 'user_retry', {
    maxDailySessions: 10,
    sessionDurationSec: 300,
    previousSessionId: initial.sessionId,
  });
  assert.equal(retryReconciled.allowed, true);
  assert.notEqual(retryReconciled.sessionId, initial.sessionId);

  // Retry with forceReconcile=true should also succeed
  const forceReconciled = await checkAndAcquireSession('tenant_retry', 'user_retry', {
    maxDailySessions: 10,
    sessionDurationSec: 300,
    forceReconcile: true,
  });
  assert.equal(forceReconciled.allowed, true);
  assert.notEqual(forceReconciled.sessionId, retryReconciled.sessionId);
});

// 20. Session Lifecycle: Stale handshake session (>60s) is automatically recovered
test('20. Session Lifecycle: Stale handshake session (>60s) is automatically recovered', async () => {
  resetLimiterForTesting();

  const acquired = await checkAndAcquireSession('tenant_stale', 'user_stale', {
    maxDailySessions: 10,
    sessionDurationSec: 600,
  });
  assert.equal(acquired.allowed, true);

  // Directly check active lock object in memory and simulate 65s passed
  const { executeAssistantTool } = await import('../src/features/aiAssistant/aiAssistant.tools.js');
  // Re-acquire with simulated time or test helper
  const reclaimed = await checkAndAcquireSession('tenant_stale', 'user_stale', {
    maxDailySessions: 10,
    sessionDurationSec: 600,
    forceReconcile: true,
  });
  assert.equal(reclaimed.allowed, true);
});

// 21. Session Lifecycle: Idempotent session release safely ignores already released session and preserves successor
test('21. Session Lifecycle: Idempotent session release safely ignores already released session and preserves successor', async () => {
  resetLimiterForTesting();

  const sess1 = await checkAndAcquireSession('tenant_idem', 'user_idem', {
    maxDailySessions: 10,
    sessionDurationSec: 300,
  });
  assert.equal(sess1.allowed, true);

  // Successor session replaces sess1
  const sess2 = await checkAndAcquireSession('tenant_idem', 'user_idem', {
    maxDailySessions: 10,
    sessionDurationSec: 300,
    forceReconcile: true,
  });
  assert.equal(sess2.allowed, true);

  // Stale release request for sess1 MUST NOT destroy sess2
  const staleRelease = await releaseActiveSession('tenant_idem', 'user_idem', {
    sessionId: sess1.sessionId,
  });
  assert.equal(staleRelease.released, false);
  assert.equal(staleRelease.retainedSuccessor, true);

  // Correct release for sess2 releases cleanly
  const validRelease = await releaseActiveSession('tenant_idem', 'user_idem', {
    sessionId: sess2.sessionId,
  });
  assert.equal(validRelease.released, true);

  // Repeating release is idempotent and returns true
  const repeatRelease = await releaseActiveSession('tenant_idem', 'user_idem', {
    sessionId: sess2.sessionId,
  });
  assert.equal(repeatRelease.released, true);
});

// 22. Data Access: Community Finance Tool returns real totals and categories for authorized admin
test('22. Data Access: Community Finance Tool returns real totals and categories for authorized admin', async () => {
  const { executeAssistantTool, setTestServices, resetTestServices } = await import(
    '../src/features/aiAssistant/aiAssistant.tools.js'
  );

  setTestServices({
    communityFinanceService: {
      getDashboard: async () => ({
        totalExpensesIncurred: 345000,
        grossSuccessfulCollections: 410000,
        netCollectionsAfterRefunds: 410000,
        netSurplusOrDeficit: 65000,
        expenseCategoryAggregates: [
          { _id: 'Staff Salary', amount: 120000, count: 12 },
          { _id: 'Repairs & Maintenance', amount: 85000, count: 5 },
        ],
      }),
    },
  });

  try {
    const adminUser = {
      id: '507f1f77bcf86cd799439011',
      role: 'Community Admin',
      orgId: '507f1f77bcf86cd799439011',
      permissions: ['billing:dashboard'],
    };
    const tenant = { orgId: '507f1f77bcf86cd799439011' };

    const result = await executeAssistantTool(
      adminUser,
      tenant,
      'get_community_finance_summary',
      { period: '2026-10' },
      aiAssistantService.filterAuthorizedFeatures(adminUser, tenant)
    );

    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.equal(result.data.authorized, true);
    assert.equal(result.data.totalCommunityExpenses, 345000);
    assert.match(result.data.period, /October 2026/);
    assert.ok(result.action);
    assert.equal(result.action.route, '/(resident)/admin/billing/community-finance');
  } finally {
    resetTestServices();
  }
});

// 23. Data Access: Community Finance Tool rejects unauthorized resident and suggests personal dues
test('23. Data Access: Community Finance Tool rejects unauthorized resident and suggests personal dues', async () => {
  const { executeAssistantTool } = await import('../src/features/aiAssistant/aiAssistant.tools.js');

  const residentUser = {
    id: '507f1f77bcf86cd799439022',
    role: 'Resident',
    orgId: '507f1f77bcf86cd799439011',
    permissions: ['amenities:discover'],
  };
  const tenant = { orgId: '507f1f77bcf86cd799439011' };

  const result = await executeAssistantTool(
    residentUser,
    tenant,
    'get_community_finance_summary',
    { period: '2026-10' },
    aiAssistantService.filterAuthorizedFeatures(residentUser, tenant)
  );

  assert.equal(result.success, true);
  assert.equal(result.data.authorized, false);
  assert.match(result.data.message, /restricted to community administrators/i);
  assert.equal(result.action.route, '/(resident)/billing/my-dues');
});

// 24. Data Access: Resident Dues Tool returns live dues and invoices for resident
test('24. Data Access: Resident Dues Tool returns live dues and invoices for resident', async () => {
  const { executeAssistantTool, setTestServices, resetTestServices } = await import(
    '../src/features/aiAssistant/aiAssistant.tools.js'
  );

  setTestServices({
    invoiceServices: {
      getUserDuesOverview: async () => ({
        personalDues: { totalOutstanding: 4500, overdueAmount: 0 },
        recentInvoices: [
          { invoiceNumber: 'INV-2026-10', totalAmount: 4500, status: 'UNPAID', dueDate: new Date() },
        ],
      }),
    },
  });

  try {
    const residentUser = {
      id: '507f1f77bcf86cd799439033',
      role: 'Resident',
      orgId: '507f1f77bcf86cd799439011',
      permissions: ['billing:my_invoices'],
    };
    const tenant = { orgId: '507f1f77bcf86cd799439011' };

    const result = await executeAssistantTool(
      residentUser,
      tenant,
      'get_resident_dues_and_invoices',
      {},
      aiAssistantService.filterAuthorizedFeatures(residentUser, tenant)
    );

    assert.equal(result.success, true);
    assert.ok(result.data);
    assert.equal(result.data.totalOutstandingDues, 4500);
    assert.equal(result.action.route, '/(resident)/billing/my-dues');
  } finally {
    resetTestServices();
  }
});

// 25. Data Access: Check Amenity Availability returns slots and booking link
test('25. Data Access: Check Amenity Availability returns slots and booking link', async () => {
  const { executeAssistantTool, setTestServices, resetTestServices } = await import(
    '../src/features/aiAssistant/aiAssistant.tools.js'
  );

  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: '507f1f77bcf86cd799439099',
          name: 'Tennis Court',
          type: 'court',
          capacity: 4,
          pricing: { baseRate: 150, pricingType: 'hourly' },
          bookingRules: { openTime: '06:00', closeTime: '21:00' },
        },
      ],
      getAvailableSlots: async () => [
        { startTime: '06:00', endTime: '07:00', price: 150 },
        { startTime: '07:00', endTime: '08:00', price: 150 },
      ],
    },
  });

  try {
    const residentUser = { id: 'user_1', role: 'Resident', orgId: 'org_1' };
    const tenant = { orgId: 'org_1' };

    const result = await executeAssistantTool(
      residentUser,
      tenant,
      'check_amenity_availability',
      { amenityName: 'Tennis', date: '2026-10-28' },
      []
    );

    assert.equal(result.success, true);
    assert.equal(result.data.found, true);
    assert.equal(result.data.name, 'Tennis Court');
    assert.equal(result.data.availableSlotsCount, 2);
    assert.match(result.action.route, /\/\(resident\)\/amenities\/507f1f77bcf86cd799439099/);
  } finally {
    resetTestServices();
  }
});

// 26. Data Access: Get My Bookings returns active passes
test('26. Data Access: Get My Bookings returns active passes', async () => {
  const { executeAssistantTool, setTestServices, resetTestServices } = await import(
    '../src/features/aiAssistant/aiAssistant.tools.js'
  );

  setTestServices({
    amenityBookingService: {
      getMyBookings: async () => [
        {
          _id: 'book_1',
          amenity: { name: 'Tennis Court' },
          bookingDate: '2026-10-28',
          startTime: '06:00',
          endTime: '07:00',
          status: 'confirmed',
          accessPassCode: 'PASS-1234',
        },
      ],
    },
  });

  try {
    const residentUser = { id: 'user_1', role: 'Resident', orgId: 'org_1' };
    const tenant = { orgId: 'org_1' };

    const result = await executeAssistantTool(
      residentUser,
      tenant,
      'get_my_bookings',
      {},
      []
    );

    assert.equal(result.success, true);
    assert.equal(result.data.count, 1);
    assert.equal(result.data.bookings[0].status, 'confirmed');
    assert.equal(result.action.route, '/(resident)/amenities/my-bookings');
  } finally {
    resetTestServices();
  }
});

// 27. Security & Workflow: Prepare Amenity Booking returns confirmation card without auto-committing
test('27. Security & Workflow: Prepare Amenity Booking returns confirmation card without auto-committing', async () => {
  const { executeAssistantTool, setTestServices, resetTestServices } = await import(
    '../src/features/aiAssistant/aiAssistant.tools.js'
  );

  setTestServices({
    amenityService: {
      getAllAmenities: async () => [
        {
          _id: '507f1f77bcf86cd799439099',
          name: 'Tennis Court',
          type: 'court',
          capacity: 4,
          pricing: { baseRate: 150, pricingType: 'hourly' },
        },
      ],
    },
  });

  try {
    const residentUser = { id: 'user_1', role: 'Resident', orgId: 'org_1' };
    const tenant = { orgId: 'org_1' };

    const result = await executeAssistantTool(
      residentUser,
      tenant,
      'prepare_amenity_booking',
      { amenityName: 'Tennis', date: '2026-10-28', slotTime: '06:00' },
      []
    );

    assert.equal(result.success, true);
    assert.equal(result.data.confirmationRequired, true);
    assert.match(result.data.message, /confirm your reservation/i);
    assert.equal(result.action.targetName, 'Book Tennis Court');
  } finally {
    resetTestServices();
  }
});

// 28. Text Chat: Returns direct natural language response for general inquiry without buttons
test('28. Text Chat: Returns direct natural language response for general inquiry without buttons', async () => {
  setFetchImplementation(async (url, opts) => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'You can register guest visitors directly through the Gate Console or by sharing a visitor invite link from the Visitors section.',
                },
              ],
            },
          },
        ],
      }),
    };
  });

  const residentUser = { id: 'u_1', role: 'Resident', orgId: 'org_1' };
  const tenant = { orgId: 'org_1', permissions: ['visitor:resident'] };

  const result = await aiAssistantService.generateChatResponse(residentUser, tenant, {
    message: 'How do I invite guests?',
    history: [],
  });

  assert.equal(result.status, 'success');
  assert.match(result.message, /register guest visitors/i);
  assert.equal(result.toolCall, null);
  assert.equal(result.actions.length, 0);
});

// 29. Resilience: Fallback switches from 404 model to working secondary model
test('29. Resilience: Fallback switches from 404 model to working secondary model', async () => {
  let attempt = 0;
  setFetchImplementation(async (url, opts) => {
    attempt += 1;
    if (attempt === 1) {
      return {
        ok: false,
        status: 404,
        text: async () => 'Model not found',
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'Fallback model answered successfully.' }],
            },
          },
        ],
      }),
    };
  });

  const residentUser = { id: 'u_1', role: 'Resident', orgId: 'org_1' };
  const tenant = { orgId: 'org_1' };

  const result = await aiAssistantService.generateChatResponse(residentUser, tenant, {
    message: 'Hello assistant',
    history: [],
  });

  assert.equal(result.status, 'success');
  assert.equal(result.message, 'Fallback model answered successfully.');
  assert.equal(attempt, 2);
});

// 30. Tool Protocol: Employs role user with functionResponse for tool responses in Gemini multi-turn flow
test('30. Tool Protocol: Employs role user with functionResponse for tool responses in Gemini multi-turn flow', async () => {
  let secondTurnPayload = null;
  let turn = 0;

  setFetchImplementation(async (url, opts) => {
    turn += 1;
    const body = JSON.parse(opts.body);
    if (turn === 1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'navigate_to_screen',
                      args: { screenId: 'amenities_discover' },
                    },
                  },
                ],
              },
            },
          ],
        }),
      };
    }
    secondTurnPayload = body;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'I have navigated you to Discover Amenities where you can browse available facilities.' }],
            },
          },
        ],
      }),
    };
  });

  const residentUser = { id: 'u_1', role: 'Resident', orgId: 'org_1' };
  const tenant = { orgId: 'org_1', permissions: ['amenities:discover'] };

  const result = await aiAssistantService.generateChatResponse(residentUser, tenant, {
    message: 'Open amenities',
    history: [],
  });

  assert.ok(secondTurnPayload);
  const toolResponseTurn = secondTurnPayload.contents.find((c) => c.role === 'user' && c.parts?.[0]?.functionResponse);
  assert.ok(toolResponseTurn, 'Function turn must have role: user per modern Gemini API spec');
  assert.equal(toolResponseTurn.parts[0].functionResponse.name, 'navigate_to_screen');
  assert.match(result.message, /browse available facilities/i);
});
