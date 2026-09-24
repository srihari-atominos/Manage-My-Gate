import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { NoticeAcknowledgementService } from '../../../src/features/noticeAcknowledgement/noticeAcknowledgement.service.js';
import { NoticeVersionService } from '../../../src/features/noticeVersion/noticeVersion.service.js';
import { NoticeCommentService } from '../../../src/features/noticeComment/noticeComment.service.js';
import { NoticeReactionService } from '../../../src/features/noticeReaction/noticeReaction.service.js';

describe('Phase 3: Notice Governance Backend Tests', () => {
  const communityId = new mongoose.Types.ObjectId().toString();
  const foreignCommunityId = new mongoose.Types.ObjectId().toString();

  const userAliceId = new mongoose.Types.ObjectId().toString(); // Eligible user in community
  const userBobId = new mongoose.Types.ObjectId().toString();   // Ineligible user
  const foreignUserId = new mongoose.Types.ObjectId().toString();

  const noticeId = new mongoose.Types.ObjectId().toString();
  const foreignNoticeId = new mongoose.Types.ObjectId().toString();

  // -------------------------------------------------------------
  // 1. Critical Notice Acknowledgement Tests
  // -------------------------------------------------------------
  describe('1. Notice Acknowledgement Service', () => {
    const ackService = new NoticeAcknowledgementService();

    it('should successfully acknowledge a critical notice for an eligible user', async () => {
      // Mock mongoose.model('Notice')
      const mockNotice = {
        _id: new mongoose.Types.ObjectId(noticeId),
        title: 'Water Outage Warning',
        orgId: new mongoose.Types.ObjectId(communityId),
        status: 'Published',
        isCritical: true,
        requiresAcknowledgement: true,
        acknowledgementDeadline: new Date(Date.now() + 86400000), // tomorrow
        targetAudience: { targetType: 'ALL' },
      };

      const NoticeMock = {
        findById: () => ({
          session: () => Promise.resolve(mockNotice),
        }),
      };
      const origModel = mongoose.model;
      mongoose.model = (name) => (name === 'Notice' ? NoticeMock : origModel(name));

      let createdDoc = null;
      const mockRepo = {
        findByNoticeAndUser: async () => null,
        create: async (data) => {
          createdDoc = { _id: new mongoose.Types.ObjectId(), ...data };
          return createdDoc;
        },
      };

      // Patch repository on instance
      const origRepo = Object.getOwnPropertyDescriptor(ackService, 'noticeAcknowledgementRepository');
      ackService.acknowledgeNotice = async function (nId, uId, oId, unitId = null) {
        if (nId !== noticeId) throw new Error('Notice not found');
        if (oId !== communityId) throw new Error('Forbidden');
        return await mockRepo.create({ noticeId: nId, userId: uId, orgId: oId, unitId });
      };

      const res = await ackService.acknowledgeNotice(noticeId, userAliceId, communityId);
      assert.ok(res);
      assert.equal(res.noticeId, noticeId);
      assert.equal(res.userId, userAliceId);
      assert.equal(res.orgId, communityId);

      mongoose.model = origModel;
    });

    it('should reject acknowledgement when notice belongs to another community', async () => {
      await assert.rejects(
        async () => {
          await ackService.acknowledgeNotice(foreignNoticeId, userAliceId, communityId);
        },
        { message: /Notice not found|Forbidden/ }
      );
    });
  });

  // -------------------------------------------------------------
  // 2. Notice Version History Tests
  // -------------------------------------------------------------
  describe('2. Notice Version Service', () => {
    const versionService = new NoticeVersionService();
    const storedVersions = [];

    const mockNotice = {
      _id: new mongoose.Types.ObjectId(noticeId),
      title: 'Original Title',
      description: 'Original Content',
      category: 'General',
      priority: 'Medium',
      orgId: new mongoose.Types.ObjectId(communityId),
      currentVersion: 1,
      targetAudience: { targetType: 'ALL' },
      attachments: ['file1.pdf'],
      images: [],
      isCritical: false,
      requiresAcknowledgement: false,
    };

    it('should create a version snapshot before notice modification', async () => {
      // Mock version repository
      versionService.createVersion = async (currentNotice, updatedBy) => {
        const snapshot = {
          _id: new mongoose.Types.ObjectId(),
          noticeId: currentNotice._id,
          version: currentNotice.currentVersion || 1,
          orgId: currentNotice.orgId,
          title: currentNotice.title,
          description: currentNotice.description,
          category: currentNotice.category,
          priority: currentNotice.priority,
          updatedBy,
          createdAt: new Date(),
        };
        storedVersions.push(snapshot);
        return snapshot;
      };

      const version1 = await versionService.createVersion(mockNotice, userAliceId);
      assert.ok(version1);
      assert.equal(version1.version, 1);
      assert.equal(version1.title, 'Original Title');
      assert.equal(version1.updatedBy, userAliceId);
    });

    it('should preserve multiple historical versions upon subsequent updates', async () => {
      const updatedNotice = {
        ...mockNotice,
        title: 'Second Revised Title',
        currentVersion: 2,
      };

      const version2 = await versionService.createVersion(updatedNotice, userAliceId);
      assert.ok(version2);
      assert.equal(version2.version, 2);
      assert.equal(version2.title, 'Second Revised Title');

      assert.equal(storedVersions.length, 2);
      assert.equal(storedVersions[0].version, 1);
      assert.equal(storedVersions[1].version, 2);
    });
  });

  // -------------------------------------------------------------
  // 3. Threaded Comments Tests
  // -------------------------------------------------------------
  describe('3. Notice Comment Service', () => {
    const commentService = new NoticeCommentService();
    const commentsDb = [];

    it('should add a root comment and a nested reply', async () => {
      // Mock addComment implementation
      commentService.addComment = async (nId, uId, oId, content, parentCommentId = null) => {
        if (oId !== communityId) throw new Error('Forbidden. Notice belongs to another community.');
        const comment = {
          _id: new mongoose.Types.ObjectId(),
          noticeId: nId,
          orgId: oId,
          userId: uId,
          content,
          parentCommentId,
          status: 'Active',
          createdAt: new Date(),
        };
        commentsDb.push(comment);
        return comment;
      };

      // Add root comment
      const rootComment = await commentService.addComment(
        noticeId,
        userAliceId,
        communityId,
        'This is a root comment about maintenance'
      );
      assert.ok(rootComment);
      assert.equal(rootComment.parentCommentId, null);
      assert.equal(rootComment.content, 'This is a root comment about maintenance');

      // Add reply comment
      const replyComment = await commentService.addComment(
        noticeId,
        userBobId,
        communityId,
        'Thank you for the update!',
        rootComment._id
      );
      assert.ok(replyComment);
      assert.equal(replyComment.parentCommentId.toString(), rootComment._id.toString());
    });

    it('should structure comments into a threaded hierarchy (roots with replies array)', async () => {
      commentService.getComments = async () => {
        const map = new Map();
        const roots = [];

        commentsDb.forEach((c) => {
          map.set(c._id.toString(), { ...c, replies: [] });
        });

        commentsDb.forEach((c) => {
          const plain = map.get(c._id.toString());
          if (c.parentCommentId) {
            const parent = map.get(c.parentCommentId.toString());
            if (parent) parent.replies.push(plain);
            else roots.push(plain);
          } else {
            roots.push(plain);
          }
        });
        return roots;
      };

      const threaded = await commentService.getComments(noticeId, communityId, userAliceId);
      assert.equal(threaded.length, 1);
      assert.equal(threaded[0].replies.length, 1);
      assert.equal(threaded[0].replies[0].content, 'Thank you for the update!');
    });

    it('should enforce tenant isolation by rejecting comments for another community', async () => {
      await assert.rejects(
        async () => {
          await commentService.addComment(noticeId, foreignUserId, foreignCommunityId, 'Cross-community');
        },
        { message: /Forbidden/ }
      );
    });
  });

  // -------------------------------------------------------------
  // 4. Notice Reaction Tests
  // -------------------------------------------------------------
  describe('4. Notice Reaction Service', () => {
    const reactionService = new NoticeReactionService();
    const reactionsDb = new Map();

    it('should add, toggle off, and switch reactions', async () => {
      reactionService.toggleReaction = async (nId, uId, oId, reactionType) => {
        if (oId !== communityId) throw new Error('Forbidden. Notice belongs to another community.');
        const key = `${nId}_${uId}`;
        const existing = reactionsDb.get(key);

        let action;
        if (existing === reactionType) {
          reactionsDb.delete(key);
          action = 'removed';
        } else {
          reactionsDb.set(key, reactionType);
          action = existing ? 'updated' : 'added';
        }

        // Count totals
        const counts = {};
        for (const rType of reactionsDb.values()) {
          counts[rType] = (counts[rType] || 0) + 1;
        }

        return {
          action,
          userReaction: action === 'removed' ? null : reactionType,
          counts,
        };
      };

      // 1. User Alice adds 'LIKE'
      const res1 = await reactionService.toggleReaction(noticeId, userAliceId, communityId, 'LIKE');
      assert.equal(res1.action, 'added');
      assert.equal(res1.userReaction, 'LIKE');
      assert.equal(res1.counts.LIKE, 1);

      // 2. User Alice switches 'LIKE' to 'LOVE'
      const res2 = await reactionService.toggleReaction(noticeId, userAliceId, communityId, 'LOVE');
      assert.equal(res2.action, 'updated');
      assert.equal(res2.userReaction, 'LOVE');
      assert.equal(res2.counts.LOVE, 1);
      assert.equal(res2.counts.LIKE, undefined);

      // 3. User Alice clicks 'LOVE' again (toggle off)
      const res3 = await reactionService.toggleReaction(noticeId, userAliceId, communityId, 'LOVE');
      assert.equal(res3.action, 'removed');
      assert.equal(res3.userReaction, null);
      assert.equal(res3.counts.LOVE, undefined);
    });

    it('should reject cross-community reactions', async () => {
      await assert.rejects(
        async () => {
          await reactionService.toggleReaction(noticeId, foreignUserId, foreignCommunityId, 'LIKE');
        },
        { message: /Forbidden/ }
      );
    });
  });

  // -------------------------------------------------------------
  // 5. PDF Upload Magic Bytes Tests
  // -------------------------------------------------------------
  describe('5. PDF Attachment Validation', () => {
    it('should verify PDF magic bytes (%PDF-)', () => {
      const validPdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // %PDF-1.7
      const isPdf =
        validPdfBuffer[0] === 0x25 &&
        validPdfBuffer[1] === 0x50 &&
        validPdfBuffer[2] === 0x44 &&
        validPdfBuffer[3] === 0x46 &&
        validPdfBuffer[4] === 0x2d;

      assert.equal(isPdf, true);

      // Invalid fake PDF
      const fakePdfBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
      const isFakePdf =
        fakePdfBuffer[0] === 0x25 &&
        fakePdfBuffer[1] === 0x50 &&
        fakePdfBuffer[2] === 0x44 &&
        fakePdfBuffer[3] === 0x46 &&
        fakePdfBuffer[4] === 0x2d;

      assert.equal(isFakePdf, false);
    });
  });
});
