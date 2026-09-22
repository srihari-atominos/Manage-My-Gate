import mongoose from 'mongoose';
import noticeAcknowledgementRepository from './noticeAcknowledgement.repository.js';
import audienceService from '../audience/audience.service.js';
import auditLogService from '../auditLog/auditLog.services.js';
import HttpError from '../../utils/httpError.utils.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';

export class NoticeAcknowledgementService {
  /**
   * Explicitly acknowledges a critical notice.
   *
   * @param {string|mongoose.Types.ObjectId} noticeId
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} [unitId=null]
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<Object>} The acknowledgement record
   */
  async acknowledgeNotice(noticeId, userId, orgId, unitId = null, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('NoticeAcknowledgementService.acknowledgeNotice request received', {
      noticeId,
      userId,
      orgId,
      correlationId,
    });

    if (!noticeId || !mongoose.Types.ObjectId.isValid(noticeId)) {
      throw new HttpError(400, 'Invalid Notice ID.');
    }
    if (!userId || !orgId) {
      throw new HttpError(400, 'User ID and Organization ID are required.');
    }

    const Notice = mongoose.model('Notice');
    const notice = await Notice.findById(noticeId).session(session || null);

    if (!notice) {
      throw new HttpError(404, `Notice with ID ${noticeId} not found.`);
    }

    // Tenant isolation: verify community boundary
    if (notice.orgId.toString() !== orgId.toString()) {
      throw new HttpError(403, 'Forbidden. Notice belongs to another community.');
    }

    // Must be published
    if (notice.status !== 'Published') {
      throw new HttpError(400, `Cannot acknowledge a notice with status "${notice.status}".`);
    }

    // Must require acknowledgement
    if (!notice.requiresAcknowledgement) {
      throw new HttpError(400, 'This notice does not require acknowledgement.');
    }

    // Check acknowledgement deadline
    if (notice.acknowledgementDeadline && new Date() > new Date(notice.acknowledgementDeadline)) {
      throw new HttpError(400, 'The acknowledgement deadline for this notice has passed.');
    }

    // Verify user eligibility using Audience Targeting Engine
    const isEligible = await audienceService.checkEligibility(userId, notice.targetAudience, orgId, session);
    if (!isEligible) {
      throw new HttpError(403, 'You are not eligible to acknowledge this notice.');
    }

    // Idempotent: check if user already acknowledged
    const existing = await noticeAcknowledgementRepository.findByNoticeAndUser(noticeId, userId, session);
    if (existing) {
      return existing;
    }

    const acknowledgementData = {
      noticeId: new mongoose.Types.ObjectId(noticeId),
      userId: new mongoose.Types.ObjectId(userId),
      orgId: new mongoose.Types.ObjectId(orgId),
      unitId: unitId && mongoose.Types.ObjectId.isValid(unitId) ? new mongoose.Types.ObjectId(unitId) : null,
      acknowledgedAt: new Date(),
    };

    const created = await noticeAcknowledgementRepository.create(acknowledgementData, session);

    // Record governance audit event
    try {
      await auditLogService.logEvent({
        actorId: userId,
        action: 'NOTICE_ACKNOWLEDGED',
        targetId: orgId,
        metadata: {
          noticeId: noticeId.toString(),
          acknowledgementId: created._id.toString(),
          title: notice.title,
        },
      });
    } catch (auditErr) {
      logger.error('Failed to log audit event for notice acknowledgement:', auditErr);
    }

    return created;
  }

  /**
   * Retrieves paginated acknowledgements for a notice.
   *
   * @param {string|mongoose.Types.ObjectId} noticeId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @param {string|mongoose.Types.ObjectId} userId
   * @param {number} [page=1]
   * @param {number} [limit=10]
   * @returns {Promise<Object>}
   */
  async getAcknowledgements(noticeId, orgId, userId, page = 1, limit = 10) {
    if (!noticeId || !mongoose.Types.ObjectId.isValid(noticeId)) {
      throw new HttpError(400, 'Invalid Notice ID.');
    }

    const Notice = mongoose.model('Notice');
    const notice = await Notice.findById(noticeId);
    if (!notice) {
      throw new HttpError(404, `Notice with ID ${noticeId} not found.`);
    }

    if (notice.orgId.toString() !== orgId.toString()) {
      throw new HttpError(403, 'Forbidden. Notice belongs to another community.');
    }

    const { data, total } = await noticeAcknowledgementRepository.findPaginatedByNotice(
      noticeId,
      orgId,
      page,
      limit
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      summary: {
        totalAcknowledged: total,
        requiresAcknowledgement: notice.requiresAcknowledgement,
        acknowledgementDeadline: notice.acknowledgementDeadline,
        isExpired: notice.acknowledgementDeadline ? new Date() > new Date(notice.acknowledgementDeadline) : false,
      },
      pagination: {
        totalRecords: total,
        currentPage: page,
        totalPages: totalPages || 1,
        limit,
      },
    };
  }
}

export default new NoticeAcknowledgementService();
