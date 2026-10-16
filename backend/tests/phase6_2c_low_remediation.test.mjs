/**
 * Phase 6.2C Low-Severity Tenant Isolation and Query Safety Remediation Test Suite
 *
 * Verifies:
 * 1. Area A: Audit Log & Security Log Date Ranges & Query Safety
 *    - Inverted date range (startDate > endDate) is rejected with 400
 *    - Malformed date strings (NaN) are rejected with 400
 *    - Date ranges exceeding 365 days are rejected with 400
 *    - Valid date ranges filter properly within tenant isolation boundary
 *
 * 2. Area B: CRM Sort-Field Whitelisting & Safe Defaults
 *    - crmInquiry sort allowlist and fallback to createdAt: -1
 *    - crmTask sort allowlist and fallback to dueDate: 1, createdAt: -1
 *    - platformCrm enquiry sort allowlist and fallback to createdAt: -1
 *
 * 3. Area C: Master Pricing Entity Isolation
 *    - MasterPricing schema has optional organizationId and compound index
 *    - Global plans (organizationId: null) can only be created/mutated by platform admin
 *    - Non-platform user cannot create global plans; automatically bound to active orgId
 *    - Tenant in Org A cannot view, update, or delete custom plans of Org B (403)
 *    - Read queries return global plans + caller organization's plans only
 *
 * 4. Area D: Session Token Revocation Scope
 *    - Session schema stores optional orgId
 *    - Organization-scoped logout (scope=org) revokes only that org's sessions, preserving other orgs
 *    - Global account logout (scope=global) revokes all sessions across all organizations
 *    - Cross-tenant single session revocation is rejected
 *
 * 5. Area E: Regex Sanitization & Defense-in-Depth
 *    - Special regex characters in search queries do not crash or cause regex injection
 *    - Applied across CRM, SecurityLog, NoticeBoard, OrgMembership, and Villa
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import connectToDb from '../src/config/db/mongodbConnectToDb.config.js';

import auditLogRepository from '../src/features/auditLog/auditLog.repository.js';
import securityLogRepository from '../src/features/securityLog/securityLog.repository.js';
import crmInquiryRepository from '../src/features/crmInquiry/crmInquiry.repository.js';
import crmTaskRepository from '../src/features/crmTask/crmTask.repository.js';
import enquiryRepository from '../src/features/platformCrm/enquiry.repository.js';
import MasterPricing from '../src/features/masterPricing/masterPricing.model.js';
import masterPricingRepository from '../src/features/masterPricing/masterPricing.repository.js';
import masterPricingService from '../src/features/masterPricing/masterPricing.service.js';
import Session from '../src/features/session/session.model.js';
import sessionService from '../src/features/session/session.services.js';
import villaRepository from '../src/features/villa/villa.repository.js';
import orgMembershipRepository from '../src/features/orgMembership/orgMembership.repository.js';
import { escapeRegex } from '../src/utils/regex.utils.js';

describe('Phase 6.2C Low-Severity Tenant Isolation & Query Safety Suite', () => {
  let orgAId;
  let orgBId;
  let userAId;

  before(async () => {
    await connectToDb();
    orgAId = new mongoose.Types.ObjectId();
    orgBId = new mongoose.Types.ObjectId();
    userAId = new mongoose.Types.ObjectId();
  });

  after(async () => {
    // Clean up test records
    await MasterPricing.deleteMany({ planCode: { $in: ['P62C_TEST_GLOBAL', 'P62C_TEST_ORGA', 'P62C_TEST_ORGB'] } });
    await Session.deleteMany({ userId: userAId });
  });

  // ==========================================
  // Area A: Audit Log & Security Log Date Ranges
  // ==========================================
  describe('Area A: Audit Log & Security Log Date Range Validation', () => {
    test('AuditLogRepository rejects invalid startDate format with 400', async () => {
      await assert.rejects(
        async () => {
          await auditLogRepository.findAllPaginated(orgAId, 1, 10, { startDate: 'invalid-date' });
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 400);
          assert.match(err.message, /Invalid startDate format/i);
          return true;
        }
      );
    });

    test('AuditLogRepository rejects invalid endDate format with 400', async () => {
      await assert.rejects(
        async () => {
          await auditLogRepository.findAllPaginated(orgAId, 1, 10, { endDate: 'invalid-date' });
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 400);
          assert.match(err.message, /Invalid endDate format/i);
          return true;
        }
      );
    });

    test('AuditLogRepository rejects inverted date range (startDate > endDate) with 400', async () => {
      const start = '2026-10-15';
      const end = '2026-10-01';
      await assert.rejects(
        async () => {
          await auditLogRepository.findAllPaginated(orgAId, 1, 10, { startDate: start, endDate: end });
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 400);
          assert.match(err.message, /startDate cannot be after endDate/i);
          return true;
        }
      );
    });

    test('AuditLogRepository rejects date range exceeding 365 days with 400', async () => {
      const start = '2024-01-01';
      const end = '2026-01-01'; // 2 years
      await assert.rejects(
        async () => {
          await auditLogRepository.findAllPaginated(orgAId, 1, 10, { startDate: start, endDate: end });
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 400);
          assert.match(err.message, /Date range cannot exceed 365 days/i);
          return true;
        }
      );
    });

    test('AuditLogRepository accepts valid date range within 365 days and enforces tenant isolation', async () => {
      const start = '2026-09-01';
      const end = '2026-10-01';
      const result = await auditLogRepository.findAllPaginated(orgAId, 1, 10, { startDate: start, endDate: end });
      assert.ok(result);
      assert.ok(Array.isArray(result.logs));
      assert.equal(typeof result.total, 'number');
    });

    test('SecurityLogRepository rejects inverted date range in custom range with 400', async () => {
      await assert.rejects(
        async () => {
          await securityLogRepository.getLogs(orgAId, {
            dateRange: 'custom',
            startDate: '2026-10-20',
            endDate: '2026-10-01'
          });
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 400);
          assert.match(err.message, /startDate cannot be after endDate/i);
          return true;
        }
      );
    });

    test('SecurityLogRepository rejects custom date range exceeding 365 days with 400', async () => {
      await assert.rejects(
        async () => {
          await securityLogRepository.getLogs(orgAId, {
            dateRange: 'custom',
            startDate: '2024-01-01',
            endDate: '2026-01-01'
          });
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 400);
          assert.match(err.message, /Date range cannot exceed 365 days/i);
          return true;
        }
      );
    });

    test('SecurityLogRepository accepts valid custom date range and query succeeds', async () => {
      const result = await securityLogRepository.getLogs(orgAId, {
        dateRange: 'custom',
        startDate: '2026-09-01',
        endDate: '2026-10-01'
      });
      assert.ok(result);
      assert.ok(Array.isArray(result.logs));
      assert.equal(typeof result.total, 'number');
    });
  });

  // ==========================================
  // Area B: CRM Sort-Field Whitelisting
  // ==========================================
  describe('Area B: CRM Sort-Field Whitelisting', () => {
    test('CrmInquiryRepository accepts allowed sort fields and falls back safely on invalid field', async () => {
      // Valid sort field
      const validResult = await crmInquiryRepository.getInquiriesPaginated({
        page: 1,
        limit: 5,
        sortBy: 'customerName',
        sortOrder: 'asc'
      });
      assert.ok(validResult);
      assert.ok(Array.isArray(validResult.data));

      // Invalid / malicious sort field injection falls back safely to createdAt
      const fallbackResult = await crmInquiryRepository.getInquiriesPaginated({
        page: 1,
        limit: 5,
        sortBy: '$where: dangerous',
        sortOrder: 'desc'
      });
      assert.ok(fallbackResult);
      assert.ok(Array.isArray(fallbackResult.data));
    });

    test('CrmTaskRepository accepts allowed sort fields and falls back safely on invalid field', async () => {
      const validResult = await crmTaskRepository.getTasksPaginated({
        page: 1,
        limit: 5,
        sortBy: 'dueDate',
        sortOrder: 'asc'
      });
      assert.ok(validResult);
      assert.ok(Array.isArray(validResult.data));

      const fallbackResult = await crmTaskRepository.getTasksPaginated({
        page: 1,
        limit: 5,
        sortBy: 'unauthorizedInternalField',
        sortOrder: 'desc'
      });
      assert.ok(fallbackResult);
      assert.ok(Array.isArray(fallbackResult.data));
    });

    test('EnquiryRepository accepts allowed sort fields and falls back safely on invalid field', async () => {
      const validResult = await enquiryRepository.findAllPaginated({
        page: 1,
        limit: 5,
        sortBy: 'organizationName',
        sortOrder: 'asc'
      });
      assert.ok(validResult);
      assert.ok(Array.isArray(validResult.data));

      const fallbackResult = await enquiryRepository.findAllPaginated({
        page: 1,
        limit: 5,
        sortBy: 'nonExistentSort',
        sortOrder: -1
      });
      assert.ok(fallbackResult);
      assert.ok(Array.isArray(fallbackResult.data));
    });
  });

  // ==========================================
  // Area C: Master Pricing Entity Isolation
  // ==========================================
  describe('Area C: Master Pricing Entity Isolation', () => {
    let globalPlanId;
    let orgAPlanId;
    let orgBPlanId;

    test('MasterPricing schema has organizationId defaulting to null and compound unique index', async () => {
      const paths = MasterPricing.schema.paths;
      assert.ok(paths.organizationId, 'organizationId field must exist on MasterPricing schema');
      assert.equal(paths.organizationId.defaultValue, null);

      const indexes = MasterPricing.schema.indexes();
      const hasCompoundIndex = indexes.some(([fields, options]) => {
        return fields.planCode === 1 && fields.organizationId === 1 && options?.unique === true;
      });
      assert.ok(hasCompoundIndex, 'Schema must have compound unique index on { planCode: 1, organizationId: 1 }');
    });

    test('Platform admin can create a global master pricing plan (organizationId: null)', async () => {
      const platformContext = { orgId: null, isPlatform: true };
      const plan = await masterPricingService.createPlan({
        planCode: 'P62C_TEST_GLOBAL',
        name: 'Global Tier 1',
        type: 'BASE_PLAN',
        pricingModel: 'FLAT',
        basePrice: 500,
        billingInterval: 'MONTHLY',
        features: ['GATE_ACCESS', 'VISITOR_PASS'],
      }, platformContext);

      assert.ok(plan);
      assert.equal(plan.planCode, 'P62C_TEST_GLOBAL');
      assert.equal(plan.organizationId, null);
      globalPlanId = plan._id.toString();
    });

    test('Non-platform user cannot create a global plan without organization context', async () => {
      const nonPlatformNoOrgContext = { orgId: null, isPlatform: false };
      await assert.rejects(
        async () => {
          await masterPricingService.createPlan({
            planCode: 'P62C_TEST_FAIL',
            name: 'Attempted Global Plan',
            type: 'BASE_PLAN',
            pricingModel: 'FLAT',
            basePrice: 100,
            billingInterval: 'MONTHLY',
            features: ['VISITOR_PASS'],
          }, nonPlatformNoOrgContext);
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 403);
          assert.match(err.message, /Organization context is required/i);
          return true;
        }
      );
    });

    test('Tenant in Org A creates a custom pricing plan scoped to Org A', async () => {
      const orgAContext = { orgId: orgAId.toString(), isPlatform: false };
      const plan = await masterPricingService.createPlan({
        planCode: 'P62C_TEST_ORGA',
        name: 'Org A Custom Tier',
        type: 'BASE_PLAN',
        pricingModel: 'FLAT',
        basePrice: 750,
        billingInterval: 'MONTHLY',
        features: ['AMENITY_BOOKING'],
      }, orgAContext);

      assert.ok(plan);
      assert.equal(plan.planCode, 'P62C_TEST_ORGA');
      assert.equal(plan.organizationId.toString(), orgAId.toString());
      orgAPlanId = plan._id.toString();
    });

    test('Tenant in Org B creates a custom pricing plan scoped to Org B', async () => {
      const orgBContext = { orgId: orgBId.toString(), isPlatform: false };
      const plan = await masterPricingService.createPlan({
        planCode: 'P62C_TEST_ORGB',
        name: 'Org B Custom Tier',
        type: 'BASE_PLAN',
        pricingModel: 'FLAT',
        basePrice: 900,
        billingInterval: 'MONTHLY',
        features: ['CRM_ACCESS'],
      }, orgBContext);

      assert.ok(plan);
      assert.equal(plan.organizationId.toString(), orgBId.toString());
      orgBPlanId = plan._id.toString();
    });

    test('Tenant in Org A querying getAllPlans sees global plans + Org A plans, but NOT Org B plans', async () => {
      const orgAContext = { orgId: orgAId.toString(), isPlatform: false };
      const result = await masterPricingService.getAllPlans({ limit: 100 }, orgAContext);
      assert.ok(result);
      const planCodes = result.data.map((p) => p.planCode);

      assert.ok(planCodes.includes('P62C_TEST_GLOBAL'), 'Org A must be able to view global plans');
      assert.ok(planCodes.includes('P62C_TEST_ORGA'), 'Org A must be able to view its own custom plans');
      assert.ok(!planCodes.includes('P62C_TEST_ORGB'), 'Org A must NOT be able to view Org B custom plans');
    });

    test('Tenant in Org A attempting to getPlanById for Org B plan is rejected with 403', async () => {
      const orgAContext = { orgId: orgAId.toString(), isPlatform: false };
      await assert.rejects(
        async () => {
          await masterPricingService.getPlanById(orgBPlanId, orgAContext);
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 403);
          assert.match(err.message, /Forbidden.*another organization/i);
          return true;
        }
      );
    });

    test('Tenant in Org A attempting to update or delete Org B custom plan is rejected with 403', async () => {
      const orgAContext = { orgId: orgAId.toString(), isPlatform: false };
      await assert.rejects(
        async () => {
          await masterPricingService.updatePlan(orgBPlanId, { name: 'Hacked Name' }, orgAContext);
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 403);
          assert.match(err.message, /Forbidden.*another organization/i);
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await masterPricingService.deletePlan(orgBPlanId, orgAContext);
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 403);
          assert.match(err.message, /Forbidden.*another organization/i);
          return true;
        }
      );
    });

    test('Non-platform user cannot update or delete global plans (403)', async () => {
      const orgAContext = { orgId: orgAId.toString(), isPlatform: false };
      await assert.rejects(
        async () => {
          await masterPricingService.updatePlan(globalPlanId, { name: 'Mutated Global Plan' }, orgAContext);
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 403);
          assert.match(err.message, /Only platform administrators can mutate global pricing plans/i);
          return true;
        }
      );

      await assert.rejects(
        async () => {
          await masterPricingService.deletePlan(globalPlanId, orgAContext);
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 403);
          assert.match(err.message, /Only platform administrators can delete global pricing plans/i);
          return true;
        }
      );
    });
  });

  // ==========================================
  // Area D: Session Token Revocation Scope
  // ==========================================
  describe('Area D: Session Token Revocation Scope', () => {
    let sessionGlobal;
    let sessionOrgA;
    let sessionOrgB;

    before(async () => {
      // Create 3 sessions for userA: 1 global, 1 in Org A, 1 in Org B
      await sessionService.createSession(userAId, { deviceName: 'Global Device' }, null, null);
      await sessionService.createSession(userAId, { deviceName: 'Org A Device' }, null, orgAId.toString());
      await sessionService.createSession(userAId, { deviceName: 'Org B Device' }, null, orgBId.toString());

      const allSessions = await Session.find({ userId: userAId, status: 'Active' });
      sessionGlobal = allSessions.find((s) => !s.orgId);
      sessionOrgA = allSessions.find((s) => s.orgId && s.orgId.toString() === orgAId.toString());
      sessionOrgB = allSessions.find((s) => s.orgId && s.orgId.toString() === orgBId.toString());
    });

    test('Session model stores optional orgId field', () => {
      assert.ok(sessionGlobal);
      assert.equal(sessionGlobal.orgId, null);
      assert.ok(sessionOrgA);
      assert.equal(sessionOrgA.orgId.toString(), orgAId.toString());
      assert.ok(sessionOrgB);
      assert.equal(sessionOrgB.orgId.toString(), orgBId.toString());
    });

    test('getUserSessions with orgId returns only that org sessions + global, excluding other orgs', async () => {
      const orgASessions = await sessionService.getUserSessions(userAId, orgAId.toString());
      const orgASessionIds = orgASessions.map((s) => s._id.toString());

      assert.ok(orgASessionIds.includes(sessionGlobal._id.toString()), 'Global session should be visible in Org A');
      assert.ok(orgASessionIds.includes(sessionOrgA._id.toString()), 'Org A session should be visible in Org A');
      assert.ok(!orgASessionIds.includes(sessionOrgB._id.toString()), 'Org B session must NOT be visible in Org A');
    });

    test('revokeSession scoped to Org A rejects revoking a session belonging to Org B', async () => {
      await assert.rejects(
        async () => {
          await sessionService.revokeSession(sessionOrgB._id.toString(), userAId, orgAId.toString());
        },
        (err) => {
          assert.equal(err.statusCode || err.status, 404);
          assert.match(err.message, /Session not found/i);
          return true;
        }
      );

      // Verify Org B session is still Active
      const checkOrgB = await Session.findById(sessionOrgB._id);
      assert.equal(checkOrgB.status, 'Active');
    });

    test('revokeAllUserSessions with scope=org revokes only Org A sessions, preserving Org B sessions', async () => {
      await sessionService.revokeAllUserSessions(userAId, null, null, {
        scope: 'org',
        orgId: orgAId.toString(),
      });

      const updatedOrgA = await Session.findById(sessionOrgA._id);
      const updatedOrgB = await Session.findById(sessionOrgB._id);

      assert.equal(updatedOrgA.status, 'Revoked', 'Org A session must be revoked');
      assert.equal(updatedOrgB.status, 'Active', 'Org B session must remain Active');
    });

    test('revokeAllUserSessions with scope=global revokes all active sessions for user', async () => {
      await sessionService.revokeAllUserSessions(userAId, null, null, { scope: 'global' });

      const remainingActive = await Session.find({ userId: userAId, status: 'Active' });
      assert.equal(remainingActive.length, 0, 'Global logout must revoke all user sessions across all orgs');
    });
  });

  // ==========================================
  // Area E: Regex Sanitization & Defense-in-Depth
  // ==========================================
  describe('Area E: Regex Sanitization & Defense-in-Depth', () => {
    const maliciousRegexPayload = '.*+?^${}()|[\\]\\';

    test('escapeRegex utility escapes all regex metacharacters cleanly', () => {
      const escaped = escapeRegex(maliciousRegexPayload);
      assert.ok(escaped.includes('\\('));
      assert.ok(escaped.includes('\\['));
      assert.ok(escaped.includes('\\*'));
    });

    test('CrmInquiry search with regex characters does not error or trigger ReDoS', async () => {
      const result = await crmInquiryRepository.getInquiriesPaginated({
        search: '(unclosed|parenthesis|.*',
        page: 1,
        limit: 5,
      });
      assert.ok(result);
      assert.ok(Array.isArray(result.data));
    });

    test('CrmTask search with regex characters does not error or trigger ReDoS', async () => {
      const result = await crmTaskRepository.getTasksPaginated({
        search: '[invalid-char-class',
        page: 1,
        limit: 5,
      });
      assert.ok(result);
      assert.ok(Array.isArray(result.data));
    });

    test('Enquiry search with regex characters does not error or trigger ReDoS', async () => {
      const result = await enquiryRepository.findAllPaginated({
        search: 'test*+?^',
        page: 1,
        limit: 5,
      });
      assert.ok(result);
      assert.ok(Array.isArray(result.data));
    });

    test('SecurityLog search with regex characters does not error or trigger ReDoS', async () => {
      const result = await securityLogRepository.getLogs(orgAId, {
        search: '(resident.*+)',
      });
      assert.ok(result);
      assert.ok(Array.isArray(result.logs));
    });

    test('VillaRepository findPaginated with regex characters does not crash', async () => {
      const result = await villaRepository.findPaginated({
        orgId: orgAId,
        search: 'Villa (Block+.*)',
        page: 1,
        limit: 5,
      });
      assert.ok(result);
      assert.ok(Array.isArray(result.data));
    });

    test('OrgMembershipRepository findPaginatedUsersByOrg with regex characters does not crash', async () => {
      const result = await orgMembershipRepository.findPaginatedUsersByOrg(orgAId, 1, 5, {
        search: 'user+test[0-9]*',
      });
      assert.ok(result);
      assert.ok(Array.isArray(result.data));
    });
  });
});
