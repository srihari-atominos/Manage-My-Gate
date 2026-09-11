import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import outboxService from '../../../src/features/outbox/outbox.service.js';
import outboxRepository from '../../../src/features/outbox/outbox.repository.js';
import audienceService from '../../../src/features/audience/audience.service.js';
import Notification from '../../../src/features/notification/notification.model.js';
import OutboxEvent from '../../../src/features/outbox/outboxEvent.model.js';
import notificationEvents from '../../../src/features/notification/notification.events.js';
import '../../../src/features/noticeAcknowledgement/noticeAcknowledgement.model.js';
import '../../../src/features/poll/pollVote.model.js';
import { processOutboxEvents } from '../../../src/workers/outbox.worker.js';

describe('Phase 6: Async Outbox Notification Pipeline Tests', () => {
  const orgId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  describe('1. Outbox Event Enqueuing', () => {
    it('should enqueue a governance event with PENDING status and correlation ID', async () => {
      const originalCreate = outboxRepository.createEvent;
      let capturedDoc = null;

      try {
        outboxRepository.createEvent = async (eventData, session) => {
          capturedDoc = { ...eventData, _id: new mongoose.Types.ObjectId() };
          return capturedDoc;
        };

        const result = await outboxService.enqueueEvent({
          aggregateType: 'NOTICE',
          aggregateId: new mongoose.Types.ObjectId(),
          eventType: 'NOTICE_PUBLISHED',
          payload: {
            noticeId: new mongoose.Types.ObjectId(),
            orgId,
            title: 'Water Maintenance',
          },
          correlationId: 'TEST-REQ-123',
        });

        assert.ok(result);
        assert.equal(capturedDoc.eventType, 'NOTICE_PUBLISHED');
        assert.equal(capturedDoc.aggregateType, 'NOTICE');
        assert.equal(capturedDoc.status, 'PENDING');
        assert.equal(capturedDoc.correlationId, 'TEST-REQ-123');
        assert.equal(capturedDoc.retries, 0);
      } finally {
        outboxRepository.createEvent = originalCreate;
      }
    });
  });

  describe('2. Batch In-App Notification Delivery with Chunking', () => {
    it('should split large recipient lists into chunks of 100 and emit notification_created events', async () => {
      const originalInsertMany = Notification.insertMany;
      const insertedBatches = [];
      const emittedEvents = [];

      const listener = (notif) => {
        emittedEvents.push(notif);
      };
      notificationEvents.on('notification_created', listener);

      try {
        Notification.insertMany = async (docs) => {
          insertedBatches.push(docs);
          return docs.map((d) => ({ ...d, _id: new mongoose.Types.ObjectId() }));
        };

        // Create 250 unique recipient IDs
        const recipientIds = Array.from({ length: 250 }, () => new mongoose.Types.ObjectId().toString());

        const totalDelivered = await outboxService._deliverInAppNotifications({
          recipientIds,
          senderId: userId,
          title: 'Test Notification',
          body: 'This is a test notification payload',
          actionUrl: '/notices/board',
          type: 'INFO',
        });

        assert.equal(totalDelivered, 250);
        assert.equal(insertedBatches.length, 3); // 100 + 100 + 50
        assert.equal(insertedBatches[0].length, 100);
        assert.equal(insertedBatches[1].length, 100);
        assert.equal(insertedBatches[2].length, 50);
        assert.equal(emittedEvents.length, 250);
      } finally {
        Notification.insertMany = originalInsertMany;
        notificationEvents.off('notification_created', listener);
      }
    });
  });

  describe('3. Notice Published Notification Handling', () => {
    it('should resolve target audience and deliver formatted notifications', async () => {
      const originalResolve = audienceService.resolveRecipients;
      const originalDeliver = outboxService._deliverInAppNotifications;
      let deliveredArgs = null;

      try {
        const mockRecipients = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
        audienceService.resolveRecipients = async (audience, passedOrgId) => {
          assert.equal(passedOrgId.toString(), orgId.toString());
          return mockRecipients;
        };

        outboxService._deliverInAppNotifications = async (args) => {
          deliveredArgs = args;
          return args.recipientIds.length;
        };

        await outboxService.handleNoticePublished({
          noticeId: new mongoose.Types.ObjectId(),
          orgId,
          targetAudience: { type: 'ALL' },
          title: 'Annual General Meeting',
          description: 'Please attend the annual meeting in the clubhouse.',
          createdBy: userId,
          isCritical: false,
        });

        assert.ok(deliveredArgs);
        assert.equal(deliveredArgs.title, 'New Community Notice: Annual General Meeting');
        assert.equal(deliveredArgs.type, 'INFO');
        assert.equal(deliveredArgs.recipientIds.length, 2);
      } finally {
        audienceService.resolveRecipients = originalResolve;
        outboxService._deliverInAppNotifications = originalDeliver;
      }
    });

    it('should format critical notice titles with warning prefix and type', async () => {
      const originalResolve = audienceService.resolveRecipients;
      const originalDeliver = outboxService._deliverInAppNotifications;
      let deliveredArgs = null;

      try {
        audienceService.resolveRecipients = async () => [new mongoose.Types.ObjectId()];
        outboxService._deliverInAppNotifications = async (args) => {
          deliveredArgs = args;
          return 1;
        };

        await outboxService.handleNoticePublished({
          noticeId: new mongoose.Types.ObjectId(),
          orgId,
          targetAudience: { type: 'ALL' },
          title: 'Fire Drill',
          description: 'Mandatory building evacuation drill.',
          createdBy: userId,
          isCritical: true,
        });

        assert.ok(deliveredArgs);
        assert.ok(deliveredArgs.title.includes('⚠️ Critical Notice'));
        assert.equal(deliveredArgs.type, 'WARNING');
      } finally {
        audienceService.resolveRecipients = originalResolve;
        outboxService._deliverInAppNotifications = originalDeliver;
      }
    });
  });

  describe('4. Notice Acknowledgement Reminder Handling', () => {
    it('should filter out users who have already acknowledged and remind only pending residents', async () => {
      const originalResolve = audienceService.resolveRecipients;
      const originalDeliver = outboxService._deliverInAppNotifications;
      const NoticeAck = mongoose.model('NoticeAcknowledgement');
      const originalFind = NoticeAck.find;

      const user1 = new mongoose.Types.ObjectId();
      const user2 = new mongoose.Types.ObjectId();
      const user3 = new mongoose.Types.ObjectId();

      let deliveredArgs = null;

      try {
        audienceService.resolveRecipients = async () => [user1, user2, user3];

        // user1 has already acknowledged
        NoticeAck.find = () => ({
          select: async () => [{ userId: user1 }],
        });

        outboxService._deliverInAppNotifications = async (args) => {
          deliveredArgs = args;
          return args.recipientIds.length;
        };

        await outboxService.handleNoticeAcknowledgementReminder({
          noticeId: new mongoose.Types.ObjectId(),
          orgId,
          targetAudience: { type: 'ALL' },
          title: 'Urgent Evacuation Protocol',
          createdBy: userId,
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        assert.ok(deliveredArgs);
        assert.equal(deliveredArgs.recipientIds.length, 2);
        assert.ok(deliveredArgs.recipientIds.map((id) => id.toString()).includes(user2.toString()));
        assert.ok(deliveredArgs.recipientIds.map((id) => id.toString()).includes(user3.toString()));
        assert.ok(!deliveredArgs.recipientIds.map((id) => id.toString()).includes(user1.toString()));
      } finally {
        audienceService.resolveRecipients = originalResolve;
        outboxService._deliverInAppNotifications = originalDeliver;
        NoticeAck.find = originalFind;
      }
    });
  });

  describe('5. Poll Activated Notification Handling', () => {
    it('should resolve eligible voters and deliver poll opening announcements', async () => {
      const originalResolve = audienceService.resolveRecipients;
      const originalDeliver = outboxService._deliverInAppNotifications;
      let deliveredArgs = null;

      try {
        const voter1 = new mongoose.Types.ObjectId();
        const voter2 = new mongoose.Types.ObjectId();
        audienceService.resolveRecipients = async () => [voter1, voter2];

        outboxService._deliverInAppNotifications = async (args) => {
          deliveredArgs = args;
          return args.recipientIds.length;
        };

        await outboxService.handlePollActivated({
          pollId: new mongoose.Types.ObjectId(),
          orgId,
          targetAudience: { type: 'ALL' },
          question: 'Should we upgrade the gymnasium equipment?',
          createdBy: userId,
        });

        assert.ok(deliveredArgs);
        assert.equal(deliveredArgs.title, 'New Community Poll Active');
        assert.equal(deliveredArgs.actionUrl, '/notices/polls');
        assert.equal(deliveredArgs.recipientIds.length, 2);
      } finally {
        audienceService.resolveRecipients = originalResolve;
        outboxService._deliverInAppNotifications = originalDeliver;
      }
    });
  });

  describe('6. Poll Closed Notification Handling', () => {
    it('should notify community with winning option and finalized outcome', async () => {
      const originalResolve = audienceService.resolveRecipients;
      const originalDeliver = outboxService._deliverInAppNotifications;
      let deliveredArgs = null;

      try {
        audienceService.resolveRecipients = async () => [new mongoose.Types.ObjectId()];

        outboxService._deliverInAppNotifications = async (args) => {
          deliveredArgs = args;
          return 1;
        };

        await outboxService.handlePollClosed({
          pollId: new mongoose.Types.ObjectId(),
          orgId,
          targetAudience: { type: 'ALL' },
          question: 'Choose Clubhouse Paint Color',
          createdBy: userId,
          outcome: 'DECIDED',
          winningOption: { text: 'Warm Beige' },
        });

        assert.ok(deliveredArgs);
        assert.equal(deliveredArgs.title, 'Community Poll Closed: Results Ready');
        assert.ok(deliveredArgs.body.includes('Winner: "Warm Beige"'));
        assert.equal(deliveredArgs.type, 'SUCCESS');
      } finally {
        audienceService.resolveRecipients = originalResolve;
        outboxService._deliverInAppNotifications = originalDeliver;
      }
    });
  });

  describe('7. Poll Closing Soon Notification Handling', () => {
    it('should filter out voters who already voted and alert only remaining voters', async () => {
      const originalResolve = audienceService.resolveRecipients;
      const originalDeliver = outboxService._deliverInAppNotifications;
      const PollVote = mongoose.model('PollVote');
      const originalFind = PollVote.find;

      const voterA = new mongoose.Types.ObjectId();
      const voterB = new mongoose.Types.ObjectId();

      let deliveredArgs = null;

      try {
        audienceService.resolveRecipients = async () => [voterA, voterB];

        // voterA has already voted
        PollVote.find = () => ({
          select: async () => [{ residentId: voterA }],
        });

        outboxService._deliverInAppNotifications = async (args) => {
          deliveredArgs = args;
          return args.recipientIds.length;
        };

        await outboxService.handlePollClosingSoon({
          pollId: new mongoose.Types.ObjectId(),
          orgId,
          targetAudience: { type: 'ALL' },
          question: 'Security Gate Schedule Vote',
          createdBy: userId,
        });

        assert.ok(deliveredArgs);
        assert.equal(deliveredArgs.recipientIds.length, 1);
        assert.equal(deliveredArgs.recipientIds[0].toString(), voterB.toString());
        assert.equal(deliveredArgs.type, 'WARNING');
      } finally {
        audienceService.resolveRecipients = originalResolve;
        outboxService._deliverInAppNotifications = originalDeliver;
        PollVote.find = originalFind;
      }
    });
  });

  describe('8. Outbox Worker Atomic Processing Loop', () => {
    it('should atomically lock PENDING events, process via outboxService, and mark COMPLETED', async () => {
      const originalFindOneAndUpdate = OutboxEvent.findOneAndUpdate;
      const originalProcessEvent = outboxService.processEvent;

      let processedEvents = [];
      let savedStatus = null;

      const mockEventDoc = {
        _id: new mongoose.Types.ObjectId(),
        eventType: 'NOTICE_PUBLISHED',
        status: 'PROCESSING',
        retries: 0,
        payload: {
          noticeId: new mongoose.Types.ObjectId(),
          orgId,
          title: 'Worker Test Notice',
        },
        save: async function () {
          savedStatus = this.status;
        },
      };

      let findCount = 0;

      try {
        OutboxEvent.findOneAndUpdate = async (query, update) => {
          findCount++;
          if (findCount === 1) {
            return mockEventDoc;
          }
          return null; // Stop after first event
        };

        outboxService.processEvent = async (event) => {
          processedEvents.push(event);
        };

        await processOutboxEvents();

        assert.equal(processedEvents.length, 1);
        assert.equal(processedEvents[0]._id.toString(), mockEventDoc._id.toString());
        assert.equal(savedStatus, 'COMPLETED');
      } finally {
        OutboxEvent.findOneAndUpdate = originalFindOneAndUpdate;
        outboxService.processEvent = originalProcessEvent;
      }
    });
  });
});
