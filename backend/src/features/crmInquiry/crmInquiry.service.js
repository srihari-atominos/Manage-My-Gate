import mongoose from 'mongoose';
import crmInquiryRepository from './crmInquiry.repository.js';
import crmInquiryEvents from './crmInquiry.events.js';
import HttpError from '../../utils/httpError.utils.js';

export const ALLOWED_TRANSITIONS = {
  NEW_INQUIRY: ['QUALIFIED'],
  QUALIFIED: ['DEMO_SCHEDULED'],
  DEMO_SCHEDULED: ['DEMO_COMPLETED'],
  DEMO_COMPLETED: [],
};

export const NEXT_ACTION_MAP = {
  NEW_INQUIRY: 'Qualify Inquiry',
  QUALIFIED: 'Schedule Demo',
  DEMO_SCHEDULED: 'Complete Demo',
  DEMO_COMPLETED: 'Generate Quote',
};

export class CrmInquiryService {
  /**
   * Generate unique inquiry ID: INQ-YYYYMMDD-XXXX
   */
  generateInquiryId() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `INQ-${yyyy}${mm}${dd}-${randomSuffix}`;
  }

  /**
   * Create a new CRM Inquiry.
   * @param {Object} payload
   */
  async createInquiry(payload) {
    let inquiryId = payload.inquiryId;

    if (!inquiryId) {
      inquiryId = this.generateInquiryId();
      let existing = await crmInquiryRepository.findByInquiryId(inquiryId);
      let attempts = 0;
      while (existing && attempts < 5) {
        inquiryId = this.generateInquiryId();
        existing = await crmInquiryRepository.findByInquiryId(inquiryId);
        attempts++;
      }
    } else {
      const existing = await crmInquiryRepository.findByInquiryId(inquiryId);
      if (existing) {
        throw new HttpError(400, `Inquiry ID '${inquiryId}' already exists`);
      }
    }

    const inquiryData = {
      ...payload,
      customerName: payload.customerName || payload.contactName || payload.username || payload.name || 'Valued Customer',
      organizationName: payload.organizationName || payload.communityName || 'Community Complex',
      unitCount: payload.unitCount || payload.villaCount || 1,
      contactEmail: payload.contactEmail || payload.email,
      contactPhone: payload.contactPhone || payload.phone,
      inquiryId,
      status: 'NEW_INQUIRY',
      currentStage: 'NEW_INQUIRY',
      nextAction: NEXT_ACTION_MAP.NEW_INQUIRY,
      timelineCount: 1,
      meetingCount: 0,
      conversationCount: 0,
      taskCount: 0,
      lastActivityAt: new Date(),
      statusChangedAt: new Date(),
    };

    // 1. Check duplicate inquiry
    const existingDup = await crmInquiryRepository.findPossibleDuplicate(
      inquiryData.contactEmail,
      inquiryData.organizationName
    );

    if (existingDup) {
      inquiryData.isPossibleDuplicate = true;
      inquiryData.duplicateOfId = existingDup._id;
    }

    const newInquiry = await crmInquiryRepository.create(inquiryData);

    // Append initial timeline event
    try {
      await crmInquiryRepository.createTimelineEvent({
        inquiryId: newInquiry._id,
        humanInquiryId: newInquiry.inquiryId,
        eventType: 'INQUIRY_CREATED',
        category: 'SYSTEM',
        fromStatus: null,
        toStatus: 'NEW_INQUIRY',
        actorId: payload.actorId || null,
        actorName: payload.actorName || 'System',
        timestamp: new Date(),
        metadata: { originSource: payload.originSource || 'MANUAL', isPossibleDuplicate: newInquiry.isPossibleDuplicate },
      });
    } catch (err) {
      console.error('Failed to log INQUIRY_CREATED timeline event:', err);
    }

    // Audit log
    try {
      const auditLogService = (await import('../auditLog/auditLog.services.js')).default;
      const validActorId = (payload.actorId && mongoose.Types.ObjectId.isValid(payload.actorId))
        ? payload.actorId
        : new mongoose.Types.ObjectId('000000000000000000000000');
      await auditLogService.logEvent({
        actorId: validActorId,
        action: 'INQUIRY_CREATED',
        targetId: newInquiry._id,
        metadata: { entity: 'CRM_INQUIRY', entityId: String(newInquiry._id), newValue: 'NEW_INQUIRY' },
      });
    } catch (auditErr) {
      console.error('Failed to log audit entry for inquiry creation:', auditErr);
    }

    // Emit domain event
    crmInquiryEvents.emit('crm.inquiry.created', newInquiry);

    return newInquiry;
  }

  /**
   * Centralized Inquiry Status Transition Function with Optimistic Concurrency Lock.
   * @param {string} id - MongoDB ID or inquiryId string
   * @param {string} nextStatus - Target state
   * @param {string|null} actorId
   * @param {string} actorName
   * @param {Object} metadata
   */
  async transitionInquiryStatus(id, nextStatus, actorId = null, actorName = 'System', metadata = {}) {
    const inquiry = await this.getInquiryById(id);
    const currentStatus = inquiry.status || 'NEW_INQUIRY';
    const currentVersion = inquiry.version || 1;

    if (currentStatus === nextStatus) {
      return inquiry; // Idempotent
    }

    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(nextStatus)) {
      throw new HttpError(
        400,
        `Invalid status transition from '${currentStatus}' to '${nextStatus}'. Allowed transition for '${currentStatus}' is '${allowedNext.join(', ') || 'none'}'.`
      );
    }

    // Next Action & SLA Timestamps Engine
    const updatePayload = {
      status: nextStatus,
      currentStage: nextStatus,
      statusChangedAt: new Date(),
      statusChangedBy: actorId || null,
      lastActivityAt: new Date(),
      timelineCount: (inquiry.timelineCount || 0) + 1,
    };

    if (nextStatus === 'QUALIFIED') {
      updatePayload.nextAction = 'SCHEDULE_DEMO';
      updatePayload.nextActionDue = new Date(Date.now() + 48 * 3600 * 1000);
      updatePayload.qualifiedAt = new Date();
    } else if (nextStatus === 'DEMO_SCHEDULED') {
      updatePayload.nextAction = 'COMPLETE_DEMO';
      updatePayload.nextActionDue = metadata.startTime ? new Date(metadata.startTime) : new Date(Date.now() + 24 * 3600 * 1000);
      updatePayload.demoScheduledAt = new Date();
    } else if (nextStatus === 'DEMO_COMPLETED') {
      updatePayload.nextAction = 'GENERATE_QUOTE';
      updatePayload.nextActionDue = new Date(Date.now() + 24 * 3600 * 1000);
      updatePayload.demoCompletedAt = new Date();
    }

    // Atomic Optimistic Concurrency Update
    const updatedInquiry = await crmInquiryRepository.updateWithVersionLock(
      inquiry._id,
      currentStatus,
      currentVersion,
      updatePayload
    );

    if (!updatedInquiry) {
      throw new HttpError(
        409,
        `Conflict: CRM Inquiry '${inquiry.inquiryId}' status or version changed concurrently by another user. Please refresh and try again.`
      );
    }

    // Append immutable timeline event
    try {
      await crmInquiryRepository.createTimelineEvent({
        inquiryId: updatedInquiry._id,
        humanInquiryId: updatedInquiry.inquiryId,
        eventType: 'STATUS_CHANGED',
        category: 'STATUS',
        fromStatus: currentStatus,
        toStatus: nextStatus,
        actorId: actorId || null,
        actorName: actorName || 'System',
        timestamp: new Date(),
        metadata,
      });
    } catch (err) {
      console.error('Failed to log STATUS_CHANGED timeline event:', err);
    }

    // Audit log
    try {
      const auditLogService = (await import('../auditLog/auditLog.services.js')).default;
      const validActorId = (actorId && mongoose.Types.ObjectId.isValid(actorId))
        ? actorId
        : new mongoose.Types.ObjectId('000000000000000000000000');
      await auditLogService.logEvent({
        actorId: validActorId,
        action: 'STATUS_CHANGED',
        targetId: updatedInquiry._id,
        metadata: {
          entity: 'CRM_INQUIRY',
          entityId: String(updatedInquiry._id),
          oldValue: currentStatus,
          newValue: nextStatus,
          actorName: actorName || 'System',
          ...metadata,
        },
      });
    } catch (auditErr) {
      console.error('Failed to log audit entry for CRM inquiry transition:', auditErr);
    }

    // Emit domain event
    crmInquiryEvents.emit('crm.inquiry.statusChanged', {
      inquiry: updatedInquiry,
      fromStatus: currentStatus,
      toStatus: nextStatus,
      actorId,
      actorName,
    });

    return updatedInquiry;
  }

  /**
   * Get paginated list of CRM inquiries.
   * @param {Object} queryParams
   */
  async getInquiries(queryParams) {
    return await crmInquiryRepository.getInquiriesPaginated(queryParams);
  }

  /**
   * Get a single CRM inquiry by MongoDB _id or inquiryId.
   * @param {string|Object} id
   */
  async getInquiryById(id) {
    if (!id) {
      throw new HttpError(400, 'Inquiry ID is required');
    }
    const idStr = String(id._id || id);
    let inquiry = null;

    if (idStr.match(/^[0-9a-fA-F]{24}$/)) {
      inquiry = await crmInquiryRepository.findById(idStr);
    }
    if (!inquiry) {
      inquiry = await crmInquiryRepository.findByInquiryId(idStr);
    }

    if (!inquiry) {
      throw new HttpError(404, `CRM Inquiry '${idStr}' not found`);
    }

    return inquiry;
  }

  /**
   * Fetch immutable timeline for an inquiry.
   * @param {string} id
   */
  async getInquiryTimeline(id) {
    const inquiry = await this.getInquiryById(id);
    return await crmInquiryRepository.findTimelineByInquiryId(inquiry._id);
  }

  /**
   * Fetch summary metrics for an inquiry.
   * @param {string} id
   */
  async getInquirySummary(id) {
    const inquiry = await this.getInquiryById(id);
    return {
      inquiryId: inquiry.inquiryId,
      status: inquiry.status,
      currentStage: inquiry.currentStage,
      nextAction: inquiry.nextAction,
      nextActionDue: inquiry.nextActionDue,
      timelineCount: inquiry.timelineCount || 0,
      meetingCount: inquiry.meetingCount || 0,
      conversationCount: inquiry.conversationCount || 0,
      taskCount: inquiry.taskCount || 0,
      lastActivityAt: inquiry.lastActivityAt,
      assignedSalesRep: inquiry.assignedAgentId || null,
    };
  }

  /**
   * Append a timeline activity event (e.g. NOTE_ADDED, TASK_ASSIGNED, MEETING_SCHEDULED).
   * @param {string} inquiryId
   * @param {Object} eventData
   */
  async appendTimelineEvent(inquiryId, eventData) {
    const inquiry = await this.getInquiryById(inquiryId);

    const timelineRecord = await crmInquiryRepository.createTimelineEvent({
      inquiryId: inquiry._id,
      humanInquiryId: inquiry.inquiryId,
      eventType: eventData.eventType,
      fromStatus: inquiry.status,
      toStatus: inquiry.status,
      actorId: eventData.actorId || null,
      actorName: eventData.actorName || 'System',
      timestamp: new Date(),
      metadata: eventData.metadata || {},
    });

    const updatePayload = {
      lastActivityAt: new Date(),
      $inc: { timelineCount: 1 },
    };

    if (eventData.eventType === 'MEETING_SCHEDULED' || eventData.eventType === 'MEETING_COMPLETED') {
      updatePayload.$inc.meetingCount = 1;
    } else if (eventData.eventType === 'NOTE_ADDED') {
      updatePayload.$inc.conversationCount = 1;
    } else if (eventData.eventType === 'TASK_ASSIGNED') {
      updatePayload.$inc.taskCount = 1;
    }

    await crmInquiryRepository.updateById(inquiry._id, updatePayload);

    return timelineRecord;
  }

  /**
   * Update an existing CRM inquiry details (non-status fields).
   * @param {string} id
   * @param {Object} updatePayload
   */
  async updateInquiry(id, updatePayload) {
    const existing = await this.getInquiryById(id);

    // Prevent direct status tampering via general PUT/PATCH update; status changes must go through transitionInquiryStatus
    delete updatePayload.status;

    const updatedInquiry = await crmInquiryRepository.updateById(existing._id, {
      ...updatePayload,
      lastActivityAt: new Date(),
    });

    crmInquiryEvents.emit('crm.inquiry.updated', updatedInquiry);
    return updatedInquiry;
  }

  /**
   * Assign a CRM inquiry to a Platform user.
   * @param {string} inquiryId
   * @param {string|null} userId
   */
  async assignInquiry(inquiryId, userId) {
    const inquiry = await this.getInquiryById(inquiryId);

    if (userId) {
      const userService = (await import('../user/user.services.js')).default;
      const user = await userService.getUserById(userId);
      if (!user) {
        throw new HttpError(404, `User with ID '${userId}' not found for assignment`);
      }
    }

    const updatedInquiry = await crmInquiryRepository.updateById(inquiry._id, {
      assignedAgentId: userId || null,
      lastActivityAt: new Date(),
    });

    crmInquiryEvents.emit('crm.inquiry.updated', updatedInquiry);
    return updatedInquiry;
  }

  /**
   * Assign primary and secondary ownership to an inquiry.
   * @param {string} inquiryId
   * @param {string|null} primaryOwnerId
   * @param {string|null} secondaryOwnerId
   * @param {string|null} actorId
   * @param {string} actorName
   */
  async assignOwnership(inquiryId, primaryOwnerId, secondaryOwnerId = null, actorId = null, actorName = 'System') {
    const inquiry = await this.getInquiryById(inquiryId);

    const updatePayload = {
      primaryOwnerId: primaryOwnerId || null,
      secondaryOwnerId: secondaryOwnerId || null,
      ownerAssignedAt: new Date(),
      lastActivityAt: new Date(),
    };

    const updatedInquiry = await crmInquiryRepository.updateById(inquiry._id, updatePayload);

    await crmInquiryRepository.createTimelineEvent({
      inquiryId: inquiry._id,
      humanInquiryId: inquiry.inquiryId,
      eventType: 'OWNERSHIP_CHANGED',
      category: 'SYSTEM',
      actorId,
      actorName,
      timestamp: new Date(),
      metadata: { primaryOwnerId, secondaryOwnerId },
    });

    return updatedInquiry;
  }

  /**
   * Archive an inquiry.
   * @param {string} id
   * @param {string|null} actorId
   * @param {string} actorName
   */
  async archiveInquiry(id, actorId = null, actorName = 'System') {
    const inquiry = await this.getInquiryById(id);

    const updatedInquiry = await crmInquiryRepository.updateById(inquiry._id, {
      isArchived: true,
      archivedAt: new Date(),
      archivedBy: actorId || null,
    });

    await crmInquiryRepository.createTimelineEvent({
      inquiryId: inquiry._id,
      humanInquiryId: inquiry.inquiryId,
      eventType: 'INQUIRY_ARCHIVED',
      category: 'SYSTEM',
      actorId,
      actorName,
      timestamp: new Date(),
    });

    return updatedInquiry;
  }

  /**
   * Unarchive an inquiry.
   * @param {string} id
   * @param {string|null} actorId
   * @param {string} actorName
   */
  async unarchiveInquiry(id, actorId = null, actorName = 'System') {
    const inquiry = await this.getInquiryById(id);

    const updatedInquiry = await crmInquiryRepository.updateById(inquiry._id, {
      isArchived: false,
      archivedAt: null,
      archivedBy: null,
    });

    await crmInquiryRepository.createTimelineEvent({
      inquiryId: inquiry._id,
      humanInquiryId: inquiry.inquiryId,
      eventType: 'INQUIRY_UNARCHIVED',
      category: 'SYSTEM',
      actorId,
      actorName,
      timestamp: new Date(),
    });

    return updatedInquiry;
  }

  /**
   * Delete a CRM inquiry.
   * @param {string} id
   */
  async deleteInquiry(id) {
    const existing = await this.getInquiryById(id);
    const deletedInquiry = await crmInquiryRepository.deleteById(existing._id);
    crmInquiryEvents.emit('crm.inquiry.deleted', id);
    return deletedInquiry;
  }
}

export default new CrmInquiryService();
