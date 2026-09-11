import mongoose from 'mongoose';
import outboxRepository from './outbox.repository.js';
import audienceService from '../audience/audience.service.js';
import Notification from '../notification/notification.model.js';
import notificationEvents from '../notification/notification.events.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';

export class OutboxService {
  /**
   * Enqueues an outbox event for asynchronous processing.
   * Can accept a Mongoose ClientSession to guarantee transactional atomicity.
   */
  async enqueueEvent({ aggregateType, aggregateId, eventType, payload, correlationId = null }, session = null) {
    const currentCorrelationId = correlationId || loggerStorage.getStore() || 'SYSTEM';

    const eventData = {
      eventId: new mongoose.Types.ObjectId().toString(),
      aggregateType: aggregateType || 'SYSTEM',
      aggregateId: aggregateId ? aggregateId.toString() : 'SYSTEM',
      eventType,
      payload,
      correlationId: currentCorrelationId,
      status: 'PENDING',
      retries: 0,
    };

    const event = await outboxRepository.createEvent(eventData, session);
    logger.info(`[Outbox Service] Enqueued outbox event ${event.eventId} (${eventType}) for aggregate ${aggregateId}`);
    return event;
  }

  /**
   * Dispatches and processes a single governance outbox event.
   */
  async processEvent(event) {
    logger.info(`[Outbox Service] Processing event ${event._id} of type ${event.eventType}`);

    switch (event.eventType) {
      case 'NOTICE_PUBLISHED':
        await this.handleNoticePublished(event.payload);
        break;

      case 'NOTICE_ACKNOWLEDGEMENT_REMINDER':
        await this.handleNoticeAcknowledgementReminder(event.payload);
        break;

      case 'POLL_ACTIVATED':
        await this.handlePollActivated(event.payload);
        break;

      case 'POLL_CLOSED':
      case 'POLL_FINALIZED':
        await this.handlePollClosed(event.payload);
        break;

      case 'POLL_CLOSING_SOON':
        await this.handlePollClosingSoon(event.payload);
        break;

      default:
        logger.warn(`[Outbox Service] Unhandled governance eventType: ${event.eventType}. Skipping.`);
        break;
    }
  }

  /**
   * Delivers notifications in chunks and emits real-time events.
   */
  async _deliverInAppNotifications({ recipientIds, senderId, title, body, actionUrl, type = 'INFO' }) {
    if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
      return 0;
    }

    // Deduplicate recipient IDs
    const uniqueRecipientIds = Array.from(new Set(recipientIds.map((id) => id.toString())));
    const chunkSize = 100;
    let totalDelivered = 0;

    for (let i = 0; i < uniqueRecipientIds.length; i += chunkSize) {
      const chunk = uniqueRecipientIds.slice(i, i + chunkSize);

      const notificationDocs = chunk.map((recipientId) => ({
        recipientId: new mongoose.Types.ObjectId(recipientId),
        senderId: senderId && mongoose.Types.ObjectId.isValid(senderId) ? new mongoose.Types.ObjectId(senderId) : null,
        title,
        body,
        actionUrl,
        type,
        isRead: false,
      }));

      try {
        const inserted = await Notification.insertMany(notificationDocs);
        totalDelivered += inserted.length;

        // Emit real-time socket events for each inserted notification
        inserted.forEach((notification) => {
          notificationEvents.emit('notification_created', notification);
        });
      } catch (err) {
        logger.error(`[Outbox Service] Failed to insert notification chunk: ${err.message}`);
        throw err;
      }
    }

    logger.info(`[Outbox Service] Delivered ${totalDelivered} in-app notifications for "${title}".`);
    return totalDelivered;
  }

  /**
   * Handles NOTICE_PUBLISHED outbox event.
   */
  async handleNoticePublished(payload) {
    const { orgId, targetAudience, title, description, createdBy, isCritical, noticeId } = payload;
    const recipientIds = await audienceService.resolveRecipients(targetAudience, orgId);

    if (recipientIds.length === 0) {
      logger.info(`[Outbox Service] No active recipients found for notice ${noticeId}`);
      return;
    }

    const notifTitle = isCritical ? `⚠️ Critical Notice: ${title}` : `New Community Notice: ${title}`;
    const notifBody = description
      ? `${description.slice(0, 150)}${description.length > 150 ? '...' : ''}`
      : title;

    await this._deliverInAppNotifications({
      recipientIds,
      senderId: createdBy,
      title: notifTitle,
      body: notifBody,
      actionUrl: '/notices/board',
      type: isCritical ? 'WARNING' : 'INFO',
    });
  }

  /**
   * Handles NOTICE_ACKNOWLEDGEMENT_REMINDER outbox event.
   */
  async handleNoticeAcknowledgementReminder(payload) {
    const { orgId, targetAudience, title, createdBy, noticeId, deadline } = payload;
    const eligibleUserIds = await audienceService.resolveRecipients(targetAudience, orgId);

    if (eligibleUserIds.length === 0) return;

    // Filter to users who have NOT yet acknowledged
    const NoticeAcknowledgement = mongoose.model('NoticeAcknowledgement');
    const existingAcks = await NoticeAcknowledgement.find({
      noticeId: new mongoose.Types.ObjectId(noticeId),
      orgId: new mongoose.Types.ObjectId(orgId),
    }).select('userId');

    const ackedSet = new Set(existingAcks.map((a) => a.userId.toString()));
    const pendingUserIds = eligibleUserIds.filter((id) => !ackedSet.has(id.toString()));

    if (pendingUserIds.length === 0) {
      logger.info(`[Outbox Service] All eligible recipients have already acknowledged notice ${noticeId}`);
      return;
    }

    const deadlineText = deadline ? `Deadline: ${new Date(deadline).toLocaleDateString()}` : 'Immediate action requested.';
    const notifTitle = 'Action Required: Acknowledge Critical Notice';
    const notifBody = `Please review and acknowledge the critical notice: "${title}". ${deadlineText}`;

    await this._deliverInAppNotifications({
      recipientIds: pendingUserIds,
      senderId: createdBy,
      title: notifTitle,
      body: notifBody,
      actionUrl: '/notices/board',
      type: 'WARNING',
    });
  }

  /**
   * Handles POLL_ACTIVATED outbox event.
   */
  async handlePollActivated(payload) {
    const { orgId, targetAudience, question, createdBy, pollId } = payload;
    const recipientIds = await audienceService.resolveRecipients(targetAudience, orgId);

    if (recipientIds.length === 0) {
      logger.info(`[Outbox Service] No active recipients found for poll ${pollId}`);
      return;
    }

    await this._deliverInAppNotifications({
      recipientIds,
      senderId: createdBy,
      title: 'New Community Poll Active',
      body: `A new community poll "${question}" is open for voting. Cast your vote now!`,
      actionUrl: '/notices/polls',
      type: 'INFO',
    });
  }

  /**
   * Handles POLL_CLOSED and POLL_FINALIZED outbox events.
   */
  async handlePollClosed(payload) {
    const { orgId, targetAudience, question, createdBy, outcome, winningOption, pollId } = payload;
    const recipientIds = await audienceService.resolveRecipients(targetAudience, orgId);

    if (recipientIds.length === 0) return;

    const outcomeText = winningOption ? `Winner: "${winningOption.text}"` : `Outcome: ${outcome || 'Closed'}`;

    await this._deliverInAppNotifications({
      recipientIds,
      senderId: createdBy,
      title: 'Community Poll Closed: Results Ready',
      body: `Voting has closed for "${question}". ${outcomeText}. Tap to review the final results.`,
      actionUrl: '/notices/polls',
      type: 'SUCCESS',
    });
  }

  /**
   * Handles POLL_CLOSING_SOON outbox event.
   */
  async handlePollClosingSoon(payload) {
    const { orgId, targetAudience, question, createdBy, pollId } = payload;
    const eligibleUserIds = await audienceService.resolveRecipients(targetAudience, orgId);

    if (eligibleUserIds.length === 0) return;

    // Filter to users who have NOT yet voted
    const PollVote = mongoose.model('PollVote');
    const existingVotes = await PollVote.find({
      pollId: new mongoose.Types.ObjectId(pollId),
      orgId: new mongoose.Types.ObjectId(orgId),
    }).select('residentId');

    const votedSet = new Set(existingVotes.map((v) => v.residentId.toString()));
    const pendingVoterIds = eligibleUserIds.filter((id) => !votedSet.has(id.toString()));

    if (pendingVoterIds.length === 0) {
      logger.info(`[Outbox Service] All eligible voters have already voted on poll ${pollId}`);
      return;
    }

    await this._deliverInAppNotifications({
      recipientIds: pendingVoterIds,
      senderId: createdBy,
      title: 'Poll Closing Soon!',
      body: `The poll "${question}" will close in 24 hours. Don't forget to cast your vote!`,
      actionUrl: '/notices/polls',
      type: 'WARNING',
    });
  }
}

export default new OutboxService();
