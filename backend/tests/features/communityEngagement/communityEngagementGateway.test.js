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
          receivedPollData = data;
          return {
            _id: new mongoose.Types.ObjectId(),
            ...data,
            status: data.status || 'Active',
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
});
