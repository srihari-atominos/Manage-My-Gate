import mongoose from 'mongoose';
import noticeVersionRepository from './noticeVersion.repository.js';
import auditLogService from '../auditLog/auditLog.services.js';
import HttpError from '../../utils/httpError.utils.js';
import logger, { loggerStorage } from '../../utils/logger.utils.js';

export class NoticeVersionService {
  /**
   * Creates a historical snapshot of a notice before an update.
   *
   * @param {Object} currentNotice - The existing notice document before modification
   * @param {string|mongoose.Types.ObjectId} updatedBy - User modifying the notice
   * @param {mongoose.ClientSession} [session=null]
   * @returns {Promise<Object>}
   */
  async createVersion(currentNotice, updatedBy, session = null) {
    const correlationId = loggerStorage.getStore() || 'N/A';
    logger.info('NoticeVersionService.createVersion request received', {
      noticeId: currentNotice._id,
      correlationId,
    });

    const versionNumber = currentNotice.currentVersion || 1;

    const versionData = {
      noticeId: currentNotice._id,
      version: versionNumber,
      orgId: currentNotice.orgId,
      title: currentNotice.title,
      description: currentNotice.description,
      category: currentNotice.category,
      priority: currentNotice.priority,
      targetAudience: currentNotice.targetAudience,
      attachments: currentNotice.attachments || [],
      images: currentNotice.images || [],
      isCritical: currentNotice.isCritical || false,
      requiresAcknowledgement: currentNotice.requiresAcknowledgement || false,
      acknowledgementDeadline: currentNotice.acknowledgementDeadline || null,
      allowComments: currentNotice.allowComments !== false,
      allowReactions: currentNotice.allowReactions !== false,
      updatedBy: updatedBy ? new mongoose.Types.ObjectId(updatedBy) : null,
    };

    const created = await noticeVersionRepository.create(versionData, session);

    // Record governance audit event
    try {
      await auditLogService.logEvent({
        actorId: updatedBy,
        action: 'NOTICE_VERSION_CREATED',
        targetId: currentNotice.orgId,
        metadata: {
          noticeId: currentNotice._id.toString(),
          version: versionNumber,
          title: currentNotice.title,
        },
      });
    } catch (auditErr) {
      logger.error('Failed to log audit event for notice version creation:', auditErr);
    }

    return created;
  }

  /**
   * Retrieves all historical versions for a notice.
   *
   * @param {string|mongoose.Types.ObjectId} noticeId
   * @param {string|mongoose.Types.ObjectId} orgId
   * @returns {Promise<Array>}
   */
  async getVersions(noticeId, orgId) {
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

    return await noticeVersionRepository.findByNotice(noticeId, orgId);
  }

  /**
   * Retrieves a specific historical version of a notice.
   *
   * @param {string|mongoose.Types.ObjectId} noticeId
   * @param {number} version
   * @param {string|mongoose.Types.ObjectId} orgId
   * @returns {Promise<Object>}
   */
  async getVersionByNumber(noticeId, version, orgId) {
    if (!noticeId || !mongoose.Types.ObjectId.isValid(noticeId)) {
      throw new HttpError(400, 'Invalid Notice ID.');
    }

    const verNum = parseInt(version, 10);
    if (isNaN(verNum) || verNum < 1) {
      throw new HttpError(400, 'Version must be a positive integer.');
    }

    const Notice = mongoose.model('Notice');
    const notice = await Notice.findById(noticeId);
    if (!notice) {
      throw new HttpError(404, `Notice with ID ${noticeId} not found.`);
    }

    if (notice.orgId.toString() !== orgId.toString()) {
      throw new HttpError(403, 'Forbidden. Notice belongs to another community.');
    }

    const record = await noticeVersionRepository.findByNoticeAndVersion(noticeId, verNum, orgId);
    if (!record) {
      throw new HttpError(404, `Version ${verNum} for notice ${noticeId} not found.`);
    }

    return record;
  }
}

export default new NoticeVersionService();
