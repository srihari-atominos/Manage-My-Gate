import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  CommunityEngagementService,
  communityEngagementService,
} from '../../../src/features/communityEngagement/communityEngagement.service.js';
import { validateEngagementContent } from '../../../src/features/communityEngagement/communityEngagement.validate.js';
import {
  COMMUNITY_ENGAGEMENT_CONTENT_TYPES,
  VALID_CONTENT_TYPES,
} from '../../../src/features/communityEngagement/communityEngagement.constants.js';
import enqueueCommunityEngagementOutbox from '../../../src/features/communityEngagement/communityEngagement.outbox.js';
import noticeBoardService from '../../../src/features/noticeBoard/noticeBoard.service.js';
import * as pollService from '../../../src/features/poll/poll.services.js';
import HttpError from '../../../src/utils/httpError.utils.js';

describe('Community Engagement Gateway Unit & Integration Tests (Phase 2)', () => {
  const orgA = new mongoose.Types.ObjectId();
  const orgB = new mongoose.Types.ObjectId();
  const adminUser = {
    id: new mongoose.Types.ObjectId(),
    username: 'admin_john',
    role: 'Admin',
    orgId: orgA,
  };
  const residentUser = {
    id: new mongoose.Types.ObjectId(),
    username: 'resident_jane',
    role: 'Resident',
    orgId: orgA,
  };
  const tenantContextOrgA = {
    orgId: orgA,
    role: 'Admin',
  };

  describe('1. Content-Type Validation & Rejection', () => {
    it('should expose canonical content types NOTICE and POLL', () => {
      assert.strictEqual(COMMUNITY_ENGAGEMENT_CONTENT_TYPES.NOTICE, 'NOTICE');
      assert.strictEqual(COMMUNITY_ENGAGEMENT_CONTENT_TYPES.POLL, 'POLL');
      assert.deepStrictEqual(VALID_CONTENT_TYPES, ['NOTICE', 'POLL']);
    });

    it('should reject creation when contentType is missing', async () => {
      const payload = {
        title: 'Missing Content Type',
        description: 'Testing missing type',
      };

      await assert.rejects(
        async () => {
          await communityEngagementService.createContent(payload, adminUser, tenantContextOrgA);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /contentType is required/i);
          return true;
        }
      );
    });

    it('should reject creation when contentType is invalid or unsupported', async () => {
      const payload = {
        contentType: 'SURVEY',
        title: 'Unsupported Type',
      };

      await assert.rejects(
        async () => {
          await communityEngagementService.createContent(payload, adminUser, tenantContextOrgA);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Invalid contentType/i);
          return true;
        }
      );
    });
  });

  describe('2. Authentication & Tenant Context Enforcement', () => {
    it('should reject unauthenticated caller with 401', async () => {
      const payload = {
        contentType: 'NOTICE',
        title: 'Unauthenticated Notice',
      };

      await assert.rejects(
        async () => {
          await communityEngagementService.createContent(payload, null, tenantContextOrgA);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 401);
          assert.match(err.message, /Authentication required/i);
          return true;
        }
      );
    });

    it('should reject requests without valid tenant organization context with 400', async () => {
      const payload = {
        contentType: 'NOTICE',
        title: 'Missing Tenant Notice',
      };

      await assert.rejects(
        async () => {
          await communityEngagementService.createContent(payload, adminUser, {});
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.match(err.message, /Workspace \/ Organization context is required/i);
          return true;
        }
      );
    });

    it('should enforce tenant isolation by passing tenant.orgId rather than client-provided orgId', async () => {
      let interceptedOrgId = null;
      const customNoticeService = {
        createNotice: async (data, userId, orgId) => {
          interceptedOrgId = orgId;
          return {
            _id: new mongoose.Types.ObjectId(),
            ...data,
            orgId,
            createdBy: userId,
          };
        },
      };

      const customGatewayService = new CommunityEngagementService({
        noticeService: customNoticeService,
      });

      const payload = {
        contentType: 'NOTICE',
        title: 'Spoofed Org Notice',
        description: 'Testing tenant boundary',
        category: 'General',
        priority: 'Medium',
        orgId: orgB, // Client attempts to spoof Org B
      };

      const result = await customGatewayService.createContent(
        payload,
        adminUser,
        tenantContextOrgA // Validated tenant context is Org A
      );

      assert.strictEqual(interceptedOrgId.toString(), orgA.toString());
      assert.notStrictEqual(interceptedOrgId.toString(), orgB.toString());
      assert.strictEqual(result.contentType, 'NOTICE');
    });
  });

  describe('3. Granular RBAC Permissions & Authorization', () => {
    it('should reject resident without notice creation permission with 403', async () => {
      const payload = {
        contentType: 'NOTICE',
        title: 'Resident Trying To Announce',
        description: 'Residents cannot create notices',
      };

      await assert.rejects(
        async () => {
          await communityEngagementService.createContent(payload, residentUser, tenantContextOrgA);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /permission to create notices/i);
          return true;
        }
      );
    });

    it('should reject resident without poll creation permission with 403', async () => {
      const payload = {
        contentType: 'POLL',
        question: 'Resident Trying To Create Poll',
        options: ['Yes', 'No'],
      };

      await assert.rejects(
        async () => {
          await communityEngagementService.createContent(payload, residentUser, tenantContextOrgA);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /permission to create polls/i);
          return true;
        }
      );
    });

    it('should allow Admin to bypass content creation permission checks', async () => {
      const customNoticeService = {
        createNotice: async (data, userId, orgId) => ({
          _id: new mongoose.Types.ObjectId(),
          ...data,
          orgId,
          createdBy: userId,
        }),
      };
      const customGateway = new CommunityEngagementService({
        noticeService: customNoticeService,
      });

      const payload = {
        contentType: 'NOTICE',
        title: 'Admin Notice',
        description: 'Admin can create notices',
        category: 'General',
        priority: 'Medium',
      };

      const result = await customGateway.createContent(
        payload,
        adminUser,
        tenantContextOrgA
      );

      assert.ok(result);
      assert.strictEqual(result.contentType, 'NOTICE');
    });
  });

  describe('4. Notice Domain Delegation & Contract Preservation', () => {
    it('should delegate Notice creation to noticeBoardService and normalize audience', async () => {
      let receivedData = null;
      let receivedUserId = null;
      let receivedOrgId = null;

      const customNoticeService = {
        createNotice: async (data, userId, orgId) => {
          receivedData = data;
          receivedUserId = userId;
          receivedOrgId = orgId;
          return {
            _id: new mongoose.Types.ObjectId(),
            title: data.title,
            description: data.description,
            category: data.category,
            priority: data.priority,
            targetAudience: data.targetAudience,
            scheduleDate: data.scheduleDate,
            orgId,
            createdBy: userId,
            toObject: function () {
              return { ...this };
            },
          };
        },
      };

      const customGateway = new CommunityEngagementService({
        noticeService: customNoticeService,
      });

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const payload = {
        contentType: 'NOTICE',
        title: 'Planned Water Maintenance',
        description: 'Water maintenance on block A tomorrow morning.',
        category: 'Maintenance',
        priority: 'High',
        audience: {
          targetType: 'BLOCKS',
          targetBlocks: ['Block-A'],
        },
        scheduleDate: futureDate,
      };

      const result = await customGateway.createContent(
        payload,
        adminUser,
        tenantContextOrgA
      );

      assert.strictEqual(result.contentType, 'NOTICE');
      assert.strictEqual(result.title, 'Planned Water Maintenance');
      assert.strictEqual(receivedUserId.toString(), adminUser.id.toString());
      assert.strictEqual(receivedOrgId.toString(), orgA.toString());
      assert.deepStrictEqual(receivedData.targetAudience, {
        targetType: 'BLOCKS',
        targetBlocks: ['Block-A'],
      });
      assert.strictEqual(receivedData.scheduleDate, futureDate);
    });
  });

  describe('5. Poll Domain Delegation & Scheduling Contract Preservation', () => {
    it('should delegate Poll creation to pollService and normalize string options and scheduling', async () => {
      let receivedPollData = null;

      const customPollService = {
        createPoll: async (data) => {
          const options = (data.options || []).map((opt) => ({
            text: typeof opt === 'string' ? opt.trim() : (opt.text || '').trim(),
            votesCount: 0,
          }));
          const scheduleDate = data.scheduleDate ? new Date(data.scheduleDate) : null;
          const status = data.status || (scheduleDate && scheduleDate > new Date() ? 'Scheduled' : 'Active');
          receivedPollData = { ...data, options, status };
          return {
            _id: new mongoose.Types.ObjectId(),
            ...data,
            options,
            status,
            toObject: function () {
              return { ...this };
            },
          };
        },
      };

      const customGateway = new CommunityEngagementService({
        pollService: customPollService,
      });

      const scheduleDate = new Date(Date.now() + 3600000).toISOString();
      const endDate = new Date(Date.now() + 86400000 * 3).toISOString();

      const payload = {
        contentType: 'POLL',
        question: 'Should the community gym hours be extended?',
        description: 'Vote on extending weekend hours to 10 PM.',
        options: ['Extend to 10 PM', 'Keep current 8 PM', 'Neutral'],
        choiceType: 'SINGLE_CHOICE',
        votingMode: 'ONE_PER_USER',
        scheduleDate,
        endDate,
        audience: {
          targetType: 'ALL',
        },
      };

      const result = await customGateway.createContent(
        payload,
        adminUser,
        tenantContextOrgA
      );

      assert.strictEqual(result.contentType, 'POLL');
      assert.strictEqual(result.question, 'Should the community gym hours be extended?');
      assert.strictEqual(result.status, 'Scheduled');
      assert.strictEqual(receivedPollData.options.length, 3);
      assert.strictEqual(receivedPollData.options[0].text, 'Extend to 10 PM');
      assert.strictEqual(receivedPollData.options[1].text, 'Keep current 8 PM');
      assert.strictEqual(receivedPollData.orgId.toString(), orgA.toString());
      assert.strictEqual(receivedPollData.createdBy.toString(), adminUser.id.toString());
      assert.deepStrictEqual(receivedPollData.targetAudience, { targetType: 'ALL' });
    });
  });

  describe('6. Gateway Request Validation Middleware (validateEngagementContent)', () => {
    it('should pass with valid NOTICE payload and invoke express next()', async () => {
      let nextCalled = false;
      let passedError = null;

      const req = {
        body: {
          contentType: 'NOTICE',
          title: 'Annual General Meeting',
          description: 'All residents are invited to attend.',
          category: 'Meetings',
          priority: 'Medium',
          expiryDate: new Date(Date.now() + 86400000).toISOString(),
        },
      };
      const res = {};
      const next = (err) => {
        nextCalled = true;
        passedError = err;
      };

      await validateEngagementContent(req, res, next);
      assert.strictEqual(nextCalled, true);
      assert.strictEqual(passedError, undefined);
      assert.strictEqual(req.body.contentType, 'NOTICE');
    });

    it('should reject NOTICE with missing required title', async () => {
      let passedError = null;

      const req = {
        body: {
          contentType: 'NOTICE',
          description: 'Notice with no title',
          category: 'General',
          priority: 'Low',
          expiryDate: new Date(Date.now() + 86400000).toISOString(),
        },
      };
      const res = {};
      const next = (err) => {
        passedError = err;
      };

      await validateEngagementContent(req, res, next);
      assert.ok(passedError, 'Should produce validation error');
      assert.strictEqual(passedError.statusCode, 400);
      const titleErr = passedError.details?.find((d) => d.field === 'title');
      assert.ok(titleErr, 'Should report title field error');
      assert.match(titleErr.message, /Title is required/i);
    });

    it('should reject POLL with fewer than 2 options', async () => {
      let passedError = null;

      const req = {
        body: {
          contentType: 'POLL',
          question: 'Do you support the new gate policy?',
          options: ['Yes only'],
          endDate: new Date(Date.now() + 86400000).toISOString(),
        },
      };
      const res = {};
      const next = (err) => {
        passedError = err;
      };

      await validateEngagementContent(req, res, next);
      assert.ok(passedError, 'Should produce validation error');
      assert.strictEqual(passedError.statusCode, 400);
      const optionErr = passedError.details?.find((d) => d.field === 'options');
      assert.ok(optionErr, 'Should report options validation error');
      assert.match(optionErr.message, /between 2 and 10 options/i);
    });
  });

  describe('7. Side-Effect-Free Preview Generation (previewContent)', () => {
    it('should generate Notice preview with Published projectedStatus and estimated recipients without DB writes', async () => {
      let createNoticeCalled = false;
      const mockNoticeService = {
        createNotice: async () => {
          createNoticeCalled = true;
        },
      };
      const mockAudienceService = {
        validateTarget: async (target) => target || { targetType: 'ALL' },
        countEligibleRecipients: async () => 42,
      };

      const service = new CommunityEngagementService({
        noticeService: mockNoticeService,
        audienceService: mockAudienceService,
      });

      const payload = {
        contentType: 'NOTICE',
        title: 'Water Maintenance Notice',
        description: 'Water will be shut off for maintenance.',
        category: 'Maintenance',
        priority: 'High',
      };

      const preview = await service.previewContent(payload, adminUser, tenantContextOrgA);

      assert.strictEqual(createNoticeCalled, false, 'createNotice must NOT be called on preview');
      assert.strictEqual(preview.contentType, 'NOTICE');
      assert.strictEqual(preview.title, 'Water Maintenance Notice');
      assert.strictEqual(preview.projectedStatus, 'Published');
      assert.strictEqual(preview.status, 'Published');
      assert.strictEqual(preview.estimatedRecipients, 42);
      assert.strictEqual(preview.previewOnly, true);
      assert.strictEqual(preview.orgId.toString(), orgA.toString());
    });

    it('should generate Notice preview with Scheduled projectedStatus when future scheduleDate is supplied', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const service = new CommunityEngagementService({
        audienceService: {
          validateTarget: async (t) => t,
          countEligibleRecipients: async () => 15,
        },
      });

      const payload = {
        contentType: 'NOTICE',
        title: 'Future Scheduled Notice',
        description: 'Scheduled announcement.',
        category: 'General',
        scheduleDate: futureDate,
      };

      const preview = await service.previewContent(payload, adminUser, tenantContextOrgA);

      assert.strictEqual(preview.projectedStatus, 'Scheduled');
      assert.strictEqual(preview.status, 'Scheduled');
      assert.strictEqual(preview.scheduleDate, futureDate);
      assert.strictEqual(preview.estimatedRecipients, 15);
    });

    it('should generate Poll preview with normalized options and estimated recipients without DB writes', async () => {
      let createPollCalled = false;
      const mockPollService = {
        createPoll: async () => {
          createPollCalled = true;
        },
      };
      const mockAudienceService = {
        validateTarget: async (t) => t,
        countEligibleRecipients: async () => 88,
      };

      const service = new CommunityEngagementService({
        pollService: mockPollService,
        audienceService: mockAudienceService,
      });

      const payload = {
        contentType: 'POLL',
        question: 'Do you agree with the new visitor parking policy?',
        options: ['Agree completely', 'Disagree', 'Neutral'],
        endDate: new Date(Date.now() + 172800000).toISOString(),
      };

      const preview = await service.previewContent(payload, adminUser, tenantContextOrgA);

      assert.strictEqual(createPollCalled, false, 'createPoll must NOT be called on preview');
      assert.strictEqual(preview.contentType, 'POLL');
      assert.strictEqual(preview.question, payload.question);
      assert.strictEqual(preview.projectedStatus, 'Active');
      assert.strictEqual(preview.status, 'Active');
      assert.strictEqual(preview.estimatedRecipients, 88);
      assert.strictEqual(preview.previewOnly, true);
      assert.strictEqual(preview.options.length, 3);
      assert.strictEqual(preview.options[0].text, 'Agree completely');
      assert.strictEqual(preview.options[0].votes, 0);
    });

    it('should reject preview for unauthorized resident without create permission', async () => {
      const service = new CommunityEngagementService();
      const payload = {
        contentType: 'NOTICE',
        title: 'Unauthorized resident notice',
      };

      await assert.rejects(
        async () => {
          await service.previewContent(payload, residentUser, tenantContextOrgA);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /do not have permission/i);
          return true;
        }
      );
    });
  });

  describe('8. Phase 3 Gateway Validation & Audience Verification', () => {
    it('should reject payload when targetType is invalid', async () => {
      let passedError = null;
      const req = {
        body: {
          contentType: 'NOTICE',
          title: 'Valid Title',
          description: 'Valid Description',
          category: 'General',
          priority: 'Low',
          targetAudience: {
            targetType: 'INVALID_TARGET_TYPE',
          },
        },
      };
      const res = {};
      const next = (err) => {
        passedError = err;
      };

      await validateEngagementContent(req, res, next);
      assert.ok(passedError, 'Should reject invalid targetType');
      assert.strictEqual(passedError.statusCode, 400);
      assert.match(passedError.message, /Invalid targetType "INVALID_TARGET_TYPE"/i);
    });

    it('should reject NOTICE when expiryDate is before or equal to scheduleDate', async () => {
      let passedError = null;
      const scheduleDate = new Date(Date.now() + 86400000).toISOString();
      const expiryDate = new Date(Date.now() + 43200000).toISOString(); // 12 hours earlier

      const req = {
        body: {
          contentType: 'NOTICE',
          title: 'Invalid Date Notice',
          description: 'Notice with invalid dates',
          category: 'General',
          priority: 'Low',
          scheduleDate,
          expiryDate,
        },
      };
      const res = {};
      const next = (err) => {
        passedError = err;
      };

      await validateEngagementContent(req, res, next);
      assert.ok(passedError, 'Should reject expiryDate before scheduleDate');
      assert.strictEqual(passedError.statusCode, 400);
      assert.match(passedError.message, /expiryDate must be after scheduleDate/i);
    });

    it('should reject POLL when endDate is before or equal to scheduleDate', async () => {
      let passedError = null;
      const scheduleDate = new Date(Date.now() + 86400000).toISOString();
      const endDate = new Date(Date.now() + 43200000).toISOString(); // 12 hours earlier

      const req = {
        body: {
          contentType: 'POLL',
          question: 'Invalid Date Poll Question?',
          options: ['Option 1', 'Option 2'],
          scheduleDate,
          endDate,
        },
      };
      const res = {};
      const next = (err) => {
        passedError = err;
      };

      await validateEngagementContent(req, res, next);
      assert.ok(passedError, 'Should reject endDate before scheduleDate');
      assert.strictEqual(passedError.statusCode, 400);
      assert.match(passedError.message, /endDate must be after scheduleDate/i);
    });

    it('should normalize client-provided "audience" key to "targetAudience"', async () => {
      let nextCalled = false;
      const req = {
        body: {
          contentType: 'NOTICE',
          title: 'Normalized Audience Notice',
          description: 'Valid Description',
          category: 'General',
          priority: 'Medium',
          audience: { targetType: 'ALL' },
        },
      };
      const res = {};
      const next = (err) => {
        nextCalled = true;
      };

      await validateEngagementContent(req, res, next);
      assert.strictEqual(nextCalled, true);
      assert.deepStrictEqual(req.body.targetAudience, { targetType: 'ALL' });
    });
  });

  describe('9. Standardized Outbox Dispatcher (enqueueCommunityEngagementOutbox)', () => {
    it('should reject outbox dispatch with invalid aggregateType', async () => {
      const result = await enqueueCommunityEngagementOutbox({
        aggregateType: 'INVALID_TYPE',
        aggregateId: new mongoose.Types.ObjectId(),
        eventType: 'NOTICE_PUBLISHED',
        payload: {},
      });
      assert.strictEqual(result, null);
    });

    it('should reject outbox dispatch with missing eventType', async () => {
      const result = await enqueueCommunityEngagementOutbox({
        aggregateType: 'NOTICE',
        aggregateId: new mongoose.Types.ObjectId(),
        eventType: '',
        payload: {},
      });
      assert.strictEqual(result, null);
    });

    it('should safely return null when database connection is not established', async () => {
      const result = await enqueueCommunityEngagementOutbox({
        aggregateType: 'NOTICE',
        aggregateId: new mongoose.Types.ObjectId(),
        eventType: 'NOTICE_PUBLISHED',
        payload: { title: 'Test Notice' },
      });
      // In test environment without active DB connection (readyState !== 1), returns null safely
      assert.strictEqual(result, null);
    });
  });
});
