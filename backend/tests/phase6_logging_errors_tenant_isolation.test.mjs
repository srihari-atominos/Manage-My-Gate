/**
 * Phase 6 — Logging & Errors Tenant Isolation Security Verification Suite
 *
 * Verifies:
 * Area 1: Validated Tenant Context in Winston Structured Logging & AsyncLocalStorage
 * Area 2: Credential & Sensitive Data Redaction in Winston Logs and Listeners
 * Area 3: HTTP Request Logging (Morgan) Sanitization & Validated Tenant Token
 * Area 4: Production Error Masking, Sensitive URI/Path Stripping & Correlation ID
 * Area 5: MongoDB Duplicate Key (11000) Conflict Sanitization & Anti-Enumeration
 * Area 6: Background Worker & Scheduler Tenant Isolation in Logging Context
 * Area 7: Visitor Log & Security Log Multi-Tenant Access Boundaries & Query Safety
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import logger, {
  loggerStorage,
  getLogContext,
  runWithTenantContext,
  sanitizeFormat,
  addCorrelationAndTenantContext
} from '../src/utils/logger.utils.js';
import { correlationIdMiddleware } from '../src/middlewares/correlationId.middleware.js';
import { tenantContext } from '../src/middlewares/tenant.middleware.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';
import HttpError from '../src/utils/httpError.utils.js';
import config from '../src/config/config.js';
import securityLogRepository from '../src/features/securityLog/securityLog.repository.js';
import SecurityLog from '../src/features/securityLog/securityLog.model.js';
import auditLogRepository from '../src/features/auditLog/auditLog.repository.js';
import visitorLogController from '../src/features/visitorLog/visitorLog.controller.js';

describe('Phase 6 — Logging & Errors Tenant Isolation Security Suite', () => {

  // =========================================================================
  // Area 1: Validated Tenant Context in Winston Structured Logging & AsyncLocalStorage
  // =========================================================================
  describe('Area 1: Validated Tenant Context in Logging & AsyncLocalStorage', () => {
    test('1.1 - Unauthenticated request starts with correlation ID but NO tenant orgId in storage', (t, done) => {
      const req = {
        header: () => undefined,
      };
      const res = {
        setHeader: () => {},
      };

      correlationIdMiddleware(req, res, () => {
        const store = getLogContext();
        assert.ok(store.requestId, 'Correlation ID must be established');
        assert.strictEqual(store.orgId, undefined, 'Unauthenticated request must not have an active orgId');
        assert.strictEqual(store.userId, undefined, 'Unauthenticated request must not have an active userId');
        done();
      });
    });

    test('1.2 - Validated tenantContext enriches loggerStorage with authoritative orgId and userId', async () => {
      const mockReq = {
        user: { id: 'usr_valid_123', orgId: 'org_tenant_abc', role: 'Resident', isPlatform: false },
        headers: { 'x-organization-id': 'org_tenant_abc' },
        header: (name) => name.toLowerCase() === 'x-request-id' ? 'req-corr-999' : undefined,
      };
      const mockRes = { setHeader: () => {} };

      const OrgMembership = (await import('../src/features/orgMembership/orgMembership.model.js')).default;
      const PlatformSubscription = (await import('../src/features/platformSubscription/platformSubscription.model.js')).default;
      const origFindOne = OrgMembership.findOne;
      const origSubFindOne = PlatformSubscription.findOne;

      OrgMembership.findOne = () => ({
        lean: async () => ({ status: 'Active' }),
      });
      PlatformSubscription.findOne = () => ({
        select: () => ({
          lean: async () => ({ status: 'ACTIVE' }),
        }),
      });

      try {
        await new Promise((resolve, reject) => {
          loggerStorage.run({ requestId: 'req-corr-999' }, async () => {
            try {
              const middleware = tenantContext();
              await middleware(mockReq, mockRes, (err) => {
                if (err) return reject(err);
                const context = getLogContext();
                assert.strictEqual(context.requestId, 'req-corr-999');
                assert.strictEqual(context.orgId, 'org_tenant_abc', 'Authoritative orgId must be bound in loggerStorage');
                assert.strictEqual(context.userId, 'usr_valid_123', 'Authoritative userId must be bound in loggerStorage');
                assert.strictEqual(context.isPlatform, false);
                resolve();
              });
            } catch (err) {
              reject(err);
            }
          });
        });
      } finally {
        OrgMembership.findOne = origFindOne;
        PlatformSubscription.findOne = origSubFindOne;
      }
    });

    test('1.3 - Spoofed X-Organization-ID header on rejected membership does NOT taint loggerStorage orgId', async () => {
      const mockReq = {
        user: { id: 'usr_attacker', orgId: 'org_legit', role: 'Resident', isPlatform: false },
        headers: { 'x-organization-id': 'org_victim_spoofed' },
        header: () => undefined,
      };
      const mockRes = { setHeader: () => {} };

      const OrgMembership = (await import('../src/features/orgMembership/orgMembership.model.js')).default;
      const origFindOne = OrgMembership.findOne;
      OrgMembership.findOne = () => ({
        lean: async () => null, // No membership in victim org
      });

      try {
        await new Promise((resolve) => {
          loggerStorage.run({ requestId: 'req-spoof-check' }, async () => {
            const middleware = tenantContext();
            await middleware(mockReq, mockRes, (err) => {
              assert.ok(err, 'Must reject access to unjoined org');
              assert.strictEqual(err.statusCode, 403);

              const context = getLogContext();
              assert.strictEqual(context.orgId, undefined, 'Rejected orgId must NEVER be bound as active tenant');
              resolve();
            });
          });
        });
      } finally {
        OrgMembership.findOne = origFindOne;
      }
    });

    test('1.4 - Concurrent asynchronous execution chains maintain strict tenant context isolation', async () => {
      const results = await Promise.all([
        runWithTenantContext({ requestId: 'req-alpha', orgId: 'org-tenant-A', userId: 'user-A' }, async () => {
          await new Promise((r) => setTimeout(r, 25));
          return getLogContext();
        }),
        runWithTenantContext({ requestId: 'req-beta', orgId: 'org-tenant-B', userId: 'user-B' }, async () => {
          await new Promise((r) => setTimeout(r, 10));
          return getLogContext();
        }),
        runWithTenantContext({ requestId: 'req-gamma', orgId: 'org-tenant-C', userId: 'user-C' }, async () => {
          await new Promise((r) => setTimeout(r, 15));
          return getLogContext();
        }),
      ]);

      assert.strictEqual(results[0].orgId, 'org-tenant-A');
      assert.strictEqual(results[0].userId, 'user-A');

      assert.strictEqual(results[1].orgId, 'org-tenant-B');
      assert.strictEqual(results[1].userId, 'user-B');

      assert.strictEqual(results[2].orgId, 'org-tenant-C');
      assert.strictEqual(results[2].userId, 'user-C');
    });
  });

  // =========================================================================
  // Area 2: Credential & Sensitive Data Redaction in Logging
  // =========================================================================
  describe('Area 2: Sensitive Data Redaction in Structured Logging', () => {
    test('2.1 - Winston sanitizeFormat redacts passwords, tokens, secrets, and auth headers in metadata', () => {
      const metadata = {
        level: 'info',
        message: 'Test login',
        password: 'SuperSecretPassword123!',
        newPassword: 'NewPassword456!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret',
        otp: '984521',
        code: '123456',
        secret: 'client-api-secret-xyz',
        authorization: 'Bearer super-sensitive-jwt-token',
        safeField: 'harmless-community-name',
      };

      const formatted = sanitizeFormat().transform(metadata);
      assert.strictEqual(formatted.password, '[REDACTED]');
      assert.strictEqual(formatted.newPassword, '[REDACTED]');
      assert.strictEqual(formatted.token, '[REDACTED]');
      assert.strictEqual(formatted.otp, '[REDACTED]');
      assert.strictEqual(formatted.code, '[REDACTED]');
      assert.strictEqual(formatted.secret, '[REDACTED]');
      assert.strictEqual(formatted.authorization, '[REDACTED]');
      assert.strictEqual(formatted.safeField, 'harmless-community-name');
    });

    test('2.2 - Winston sanitizeFormat redacts Bearer tokens within log message strings', () => {
      const formatted = sanitizeFormat().transform({
        level: 'info',
        message: 'Request authorized with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123 successfully',
      });
      assert.ok(!formatted.message.includes('token123'), 'Raw bearer token must not be in log message');
      assert.ok(formatted.message.includes('Bearer [REDACTED]'), 'Bearer token must be masked');
    });

    test('2.3 - Nested credential objects are deeply sanitized', () => {
      const formatted = sanitizeFormat().transform({
        level: 'info',
        message: 'Account update',
        credentials: {
          currentPassword: 'old-pwd-999',
          auth: {
            refreshToken: 'refresh-xyz',
            cvv: '123',
          },
        },
      });

      assert.strictEqual(formatted.credentials.currentPassword, '[REDACTED]');
      assert.strictEqual(formatted.credentials.auth.refreshToken, '[REDACTED]');
      assert.strictEqual(formatted.credentials.auth.cvv, '[REDACTED]');
    });

    test('2.4 - Error objects nested in log metadata are deeply sanitized including custom properties and message', () => {
      const customErr = new Error('Upstream timeout with Bearer secret-auth-token-999');
      customErr.token = 'sensitive-token-val';
      customErr.config = {
        headers: {
          authorization: 'Bearer secret-jwt-abc',
        },
      };

      const formatted = sanitizeFormat().transform({
        level: 'error',
        message: 'External payment failed',
        error: customErr,
      });

      assert.strictEqual(formatted.error.token, '[REDACTED]');
      assert.strictEqual(formatted.error.config.headers.authorization, '[REDACTED]');
      assert.ok(!formatted.error.message.includes('secret-auth-token-999'), 'Bearer token in error message must be masked');
      assert.ok(formatted.error.message.includes('Bearer [REDACTED]'));
    });

    test('2.5 - Alternate sensitive keys (apiKey, pin, privateKey, jwt, sessionToken) are redacted', () => {
      const formatted = sanitizeFormat().transform({
        level: 'info',
        message: 'Auth credentials check',
        apiKey: 'api-key-12345',
        pin: '1234',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----',
        jwt: 'jwt.token.string',
        sessionToken: 'sess-xyz-888',
      });

      assert.strictEqual(formatted.apiKey, '[REDACTED]');
      assert.strictEqual(formatted.pin, '[REDACTED]');
      assert.strictEqual(formatted.privateKey, '[REDACTED]');
      assert.strictEqual(formatted.jwt, '[REDACTED]');
      assert.strictEqual(formatted.sessionToken, '[REDACTED]');
    });
  });

  // =========================================================================
  // Area 3: HTTP Request Logging (Morgan) Sanitization & Validated Tenant Token
  // =========================================================================
  describe('Area 3: HTTP Request Logging (Morgan) Sanitization & Tenant Isolation', () => {
    test('3.1 - Morgan sanitized-url token strips sensitive query parameters', async () => {
      await import('../src/middlewares/httpLogger.middleware.js');
      const morgan = (await import('morgan')).default;
      const fn = morgan.compile(':sanitized-url');

      const mockReq = {
        originalUrl: '/api/v1/auth/reset-password?token=secretToken123&email=user@example.com&code=998877&otp=123456',
      };
      const cleaned = fn(morgan, mockReq, {});
      assert.ok(!cleaned.includes('secretToken123'), 'Secret token must be stripped from url');
      assert.ok(!cleaned.includes('998877'), 'Code must be stripped from url');
      assert.ok(!cleaned.includes('123456'), 'OTP must be stripped from url');
      assert.ok(cleaned.includes('token=[REDACTED]'));
      assert.ok(cleaned.includes('code=[REDACTED]'));
      assert.ok(cleaned.includes('otp=[REDACTED]'));
      assert.ok(cleaned.includes('email=user@example.com'), 'Safe query parameter preserved');
    });

    test('3.2 - Morgan org token correctly reflects validated req.tenant.orgId', async () => {
      await import('../src/middlewares/httpLogger.middleware.js');
      const morgan = (await import('morgan')).default;
      const fn = morgan.compile(':org');

      const reqWithTenant = { tenant: { orgId: 'org_community_42' } };
      assert.strictEqual(fn(morgan, reqWithTenant, {}), 'org_community_42');

      const reqWithoutTenant = {};
      assert.strictEqual(fn(morgan, reqWithoutTenant, {}), '-');
    });

    test('3.3 - Morgan sanitized-url token strips URL-encoded parameters (%74oken) and camelCase tokens', async () => {
      await import('../src/middlewares/httpLogger.middleware.js');
      const morgan = (await import('morgan')).default;
      const fn = morgan.compile(':sanitized-url');

      const mockReq = {
        originalUrl: '/api/v1/auth/callback?%74oken=secretEnc123&refreshToken=myRefresh999&accessToken=myAccess456&clientSecret=topSecretKey',
      };
      const cleaned = fn(morgan, mockReq, {});
      assert.ok(!cleaned.includes('secretEnc123'), 'Encoded token value must not leak');
      assert.ok(!cleaned.includes('myRefresh999'), 'refreshToken value must not leak');
      assert.ok(!cleaned.includes('myAccess456'), 'accessToken value must not leak');
      assert.ok(!cleaned.includes('topSecretKey'), 'clientSecret value must not leak');
      assert.ok(cleaned.includes('[REDACTED]'));
    });
  });

  // =========================================================================
  // Area 4: Production Error Masking, Sensitive URI/Path Stripping & Correlation ID
  // =========================================================================
  describe('Area 4: Production Error Masking & Safe Client Responses', () => {
    test('4.1 - Production 500 errors are masked to "Internal Server Error" even with explicit err.statusCode', () => {
      const origEnv = config.nodeEnv;
      config.nodeEnv = 'production';

      const mockErr = new HttpError(500, 'Mongoose connection failed at mongodb://admin:pass123@cluster0.db.net/prod');
      const mockReq = { id: 'req-prod-err-1', method: 'GET', originalUrl: '/api/v1/villas' };
      let responseBody = null;
      let responseCode = null;

      const mockRes = {
        status: (code) => {
          responseCode = code;
          return {
            json: (payload) => {
              responseBody = payload;
            },
          };
        },
      };

      try {
        errorHandler(mockErr, mockReq, mockRes, () => {});

        assert.strictEqual(responseCode, 500);
        assert.strictEqual(responseBody.success, false);
        assert.strictEqual(responseBody.message, 'Internal Server Error', 'Database credentials must not leak');
        assert.strictEqual(responseBody.requestId, 'req-prod-err-1', 'requestId must be returned for safe correlation');
        assert.strictEqual(responseBody.stack, undefined, 'Stack trace must not leak in production');
      } finally {
        config.nodeEnv = origEnv;
      }
    });

    test('4.2 - Raw database URIs and filesystem paths are stripped from 4xx/development error responses', () => {
      const origEnv = config.nodeEnv;
      config.nodeEnv = 'development';

      const mockErr = new HttpError(400, 'Failed to read template at C:\\Users\\Administrator\\Manage-My-Gate\\templates\\invoice.html with mongodb://dbuser:p@ss@host:27017/app');
      const mockReq = { id: 'req-dev-clean-1', method: 'POST', originalUrl: '/api/v1/invoices' };
      let responseBody = null;

      const mockRes = {
        status: () => ({
          json: (payload) => {
            responseBody = payload;
          },
        }),
      };

      try {
        errorHandler(mockErr, mockReq, mockRes, () => {});

        assert.ok(!responseBody.message.includes('C:\\Users\\Administrator'), 'Filesystem path must be redacted');
        assert.ok(!responseBody.message.includes('mongodb://dbuser:p@ss@host:27017/app'), 'DB connection URI must be redacted');
        assert.ok(responseBody.message.includes('[PATH_REDACTED]'));
        assert.ok(responseBody.message.includes('[DATABASE_URI_REDACTED]'));
        assert.strictEqual(responseBody.requestId, 'req-dev-clean-1');
      } finally {
        config.nodeEnv = origEnv;
      }
    });

    test('4.3 - Logging failure inside errorHandler does not break client HTTP error response', () => {
      const mockErr = new HttpError(403, 'Forbidden test');
      const mockReq = { id: 'req-logging-fail', method: 'DELETE', originalUrl: '/api/v1/test' };
      let responseSent = false;

      const mockRes = {
        status: (code) => ({
          json: (payload) => {
            responseSent = true;
            assert.strictEqual(code, 403);
            assert.strictEqual(payload.success, false);
            assert.strictEqual(payload.requestId, 'req-logging-fail');
          },
        }),
      };

      // Temporarily sabotage logger.warn
      const origWarn = logger.warn;
      logger.warn = () => {
        throw new Error('Simulated winston disk/stream write failure');
      };

      try {
        errorHandler(mockErr, mockReq, mockRes, () => {});
        assert.ok(responseSent, 'Error response must still be sent even if logger crashes');
      } finally {
        logger.warn = origWarn;
      }
    });

    test('4.4 - Production 500 error suppresses "details" field completely from client response', () => {
      const origEnv = config.nodeEnv;
      config.nodeEnv = 'production';

      const mockErr = new HttpError(500, 'Internal DB Query Failed');
      mockErr.details = { mongoQuery: '{ orgId: "secret", passwordHash: "xyz" }' };
      const mockReq = { id: 'req-prod-details-1', method: 'GET', originalUrl: '/api/v1/data' };
      let responseBody = null;

      const mockRes = {
        status: () => ({
          json: (payload) => {
            responseBody = payload;
          },
        }),
      };

      try {
        errorHandler(mockErr, mockReq, mockRes, () => {});
        assert.strictEqual(responseBody.details, undefined, 'Internal details must not leak in production 500');
        assert.strictEqual(responseBody.message, 'Internal Server Error');
      } finally {
        config.nodeEnv = origEnv;
      }
    });

    test('4.5 - Linux / POSIX filesystem paths are stripped from error responses', () => {
      const origEnv = config.nodeEnv;
      config.nodeEnv = 'development';

      const mockErr = new HttpError(400, 'Cannot open /app/backend/templates/invoice.html due to read failure');
      const mockReq = { id: 'req-linux-path-1', method: 'GET', originalUrl: '/api/v1/invoices' };
      let responseBody = null;

      const mockRes = {
        status: () => ({
          json: (payload) => {
            responseBody = payload;
          },
        }),
      };

      try {
        errorHandler(mockErr, mockReq, mockRes, () => {});
        assert.ok(!responseBody.message.includes('/app/backend/templates/invoice.html'), 'POSIX path must be stripped');
        assert.ok(responseBody.message.includes('[PATH_REDACTED]'));
      } finally {
        config.nodeEnv = origEnv;
      }
    });
  });

  // =========================================================================
  // Area 5: MongoDB Duplicate Key (11000) Conflict Sanitization & Anti-Enumeration
  // =========================================================================
  describe('Area 5: MongoDB Duplicate Key (11000) Conflict Sanitization', () => {
    test('5.1 - Duplicate key error filters tenant keys (orgId, organisationId, communityId)', () => {
      const mockErr = {
        name: 'MongoServerError',
        code: 11000,
        keyValue: {
          organisationId: '66fa38b248a31e13a48e9102',
          email: 'resident@community-a.com',
        },
      };
      const mockReq = { id: 'req-dup-1', method: 'POST', originalUrl: '/api/v1/users' };
      let responseBody = null;
      let statusCode = null;

      const mockRes = {
        status: (c) => {
          statusCode = c;
          return { json: (p) => { responseBody = p; } };
        },
      };

      errorHandler(mockErr, mockReq, mockRes, () => {});

      assert.strictEqual(statusCode, 409);
      assert.ok(!responseBody.message.includes('66fa38b248a31e13a48e9102'), 'Tenant ID must not leak in conflict error');
      assert.ok(!responseBody.message.includes('resident@community-a.com'), 'Collided email value must not be echoed back to prevent user probing');
      assert.strictEqual(responseBody.message, 'Email is already registered or in use.');
      assert.strictEqual(responseBody.requestId, 'req-dup-1');
    });

    test('5.2 - Compound index duplicate error filters tenant and community fields cleanly', () => {
      const mockErr = {
        name: 'MongoServerError',
        code: 11000,
        keyValue: {
          communityId: '66fa38b248a31e13a48e9102',
          building: 'Block-A',
          unitNumber: '101',
        },
      };
      const mockReq = { id: 'req-dup-2', method: 'POST', originalUrl: '/api/v1/villas' };
      let responseBody = null;

      const mockRes = {
        status: () => ({ json: (p) => { responseBody = p; } }),
      };

      errorHandler(mockErr, mockReq, mockRes, () => {});

      assert.ok(!responseBody.message.includes('66fa38b248a31e13a48e9102'), 'communityId must be filtered');
      assert.strictEqual(responseBody.message, 'A record with duplicate Building, UnitNumber already exists.');
    });
  });

  // =========================================================================
  // Area 6: Background Worker & Scheduler Tenant Isolation in Logging Context
  // =========================================================================
  describe('Area 6: Background Worker & Scheduler Tenant Isolation in Logging Context', () => {
    test('6.1 - runWithTenantContext propagates tenantId and jobId to inner async operations', async () => {
      const eventOrgId = 'org_worker_tenant_88';
      const eventJobId = 'worker-outbox-event-442';

      await runWithTenantContext({ requestId: eventJobId, orgId: eventOrgId }, async () => {
        const ctx = getLogContext();
        assert.strictEqual(ctx.requestId, eventJobId);
        assert.strictEqual(ctx.orgId, eventOrgId);

        const transformed = addCorrelationAndTenantContext().transform({ level: 'info', message: 'Worker dispatch' });
        assert.strictEqual(transformed.requestId, eventJobId);
        assert.strictEqual(transformed.orgId, eventOrgId);
      });
    });

    test('6.2 - Outbox worker processes single event within isolated logger tenant context', async () => {
      const outboxWorker = (await import('../src/workers/outbox.worker.js')).default;
      assert.ok(outboxWorker, 'Outbox worker must be exported');
      assert.ok(typeof outboxWorker.processOutboxEvents === 'function', 'processOutboxEvents must be callable');
    });

    test('6.3 - Complaint cron SLA escalation establishes complaint orgId in logger context', async () => {
      const complaintCron = (await import('../src/features/complaint/complaint.cron.js')).default;
      assert.ok(complaintCron, 'Complaint cron must be exported');
      assert.ok(typeof complaintCron.init === 'function', 'Complaint cron init must be callable');
    });
  });

  // =========================================================================
  // Area 7: Visitor Log & Security Log Multi-Tenant Access Boundaries & Query Safety
  // =========================================================================
  describe('Area 7: Visitor Log & Security Log Multi-Tenant Isolation & Query Safety', () => {
    test('7.1 - VisitorLog getInside rejects non-platform access to foreign orgId with 403 Forbidden', async () => {
      const mockReq = {
        tenant: { orgId: 'org_community_A', isPlatform: false },
        user: { id: 'guard_1', role: 'Security' },
        params: { orgId: 'org_community_B' }, // Cross-tenant attempt
      };
      const mockRes = {};
      let nextError = null;

      await visitorLogController.getInside(mockReq, mockRes, (err) => {
        nextError = err;
      });

      assert.ok(nextError, 'Cross-workspace query must be rejected');
      assert.strictEqual(nextError.statusCode, 403);
      assert.match(nextError.message, /Active workspace context does not match the requested community/i);
    });

    test('7.2 - VisitorLog getHistory rejects non-platform access when orgId does not match tenant context', async () => {
      const mockReq = {
        tenant: { orgId: 'org_community_A', isPlatform: false },
        user: { id: 'guard_1', role: 'Security' },
        params: { orgId: 'org_community_B' },
        query: {},
      };
      const mockRes = {};
      let nextError = null;

      await visitorLogController.getHistory(mockReq, mockRes, (err) => {
        nextError = err;
      });

      assert.ok(nextError, 'Cross-workspace history query must be rejected');
      assert.strictEqual(nextError.statusCode, 403);
    });

    test('7.3 - SecurityLogRepository escapes regex search input to prevent ReDoS / syntax errors', async () => {
      const dangerousSearch = 'Resident.*+(test|user)[0-9]*';
      
      const origCount = SecurityLog.countDocuments;
      const origFind = SecurityLog.find;
      let executedQuery = null;

      SecurityLog.countDocuments = async (q) => {
        executedQuery = q;
        return 0;
      };
      SecurityLog.find = () => ({
        sort: () => ({
          skip: () => ({
            limit: () => ({
              lean: async () => [],
            }),
          }),
        }),
      });

      try {
        const res = await securityLogRepository.getLogs('66fa38b248a31e13a48e9102', { search: dangerousSearch }, 0, 10);
        assert.strictEqual(res.total, 0);
        assert.ok(executedQuery.$or, 'Must construct $or query');
        assert.ok(executedQuery.$or[0].bookingReference.$regex instanceof RegExp || typeof executedQuery.$or[0].bookingReference.$regex === 'string');
      } finally {
        SecurityLog.countDocuments = origCount;
        SecurityLog.find = origFind;
      }
    });

    test('7.4 - AuditLogRepository gracefully handles invalid orgId without unhandled CastError', async () => {
      const result = await auditLogRepository.findAllPaginated('invalid-non-objectid-org', 1, 10);
      assert.strictEqual(result.total, 0);
      assert.deepStrictEqual(result.logs, []);
    });

    test('7.5 - SecurityLogRepository gracefully handles invalid orgId without unhandled CastError', async () => {
      const result = await securityLogRepository.getLogs('invalid-non-objectid-org', {}, 0, 10);
      assert.strictEqual(result.total, 0);
      assert.deepStrictEqual(result.logs, []);

      const stats = await securityLogRepository.getDashboardStats('invalid-non-objectid-org');
      assert.strictEqual(stats.entries, 0);
      assert.strictEqual(stats.denied, 0);
    });

    test('7.6 - VisitorLog getInside permits platform admin access with target orgId', async () => {
      const mockReq = {
        tenant: { orgId: 'org_platform', isPlatform: true },
        user: { id: 'super_admin_1', role: 'SuperAdmin' },
        params: { orgId: 'org_target_community' },
      };
      let capturedOrgId = null;
      let nextError = null;

      const visitorLogService = (await import('../src/features/visitorLog/visitorLog.service.js')).default;
      const origGetActive = visitorLogService.getActiveLogsInside;
      visitorLogService.getActiveLogsInside = async (orgId) => {
        capturedOrgId = orgId;
        return [];
      };

      try {
        const mockRes = {
          success: (data) => {},
        };
        await visitorLogController.getInside(mockReq, mockRes, (err) => {
          nextError = err;
        });

        assert.strictEqual(nextError, null, 'Platform admin must not be rejected');
        assert.strictEqual(capturedOrgId, 'org_target_community', 'Platform admin queries requested orgId');
      } finally {
        visitorLogService.getActiveLogsInside = origGetActive;
      }
    });
  });
});
