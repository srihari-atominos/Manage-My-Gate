import mongoose from 'mongoose';
import NoticeAcknowledgement from './noticeAcknowledgement.model.js';

export class NoticeAcknowledgementRepository {
  async create(data, session = null) {
    const doc = new NoticeAcknowledgement(data);
    return await doc.save(session ? { session } : undefined);
  }

  async findByNoticeAndUser(noticeId, userId, session = null) {
    return await NoticeAcknowledgement.findOne({ noticeId, userId }).session(session || null);
  }

  async countByNotice(noticeId, orgId, session = null) {
    return await NoticeAcknowledgement.countDocuments({ noticeId, orgId }).session(session || null);
  }

  async findPaginatedByNotice(noticeId, orgId, page = 1, limit = 10, session = null) {
    const skip = (page - 1) * limit;
    const query = { noticeId, orgId };

    const [data, total] = await Promise.all([
      NoticeAcknowledgement.find(query)
        .populate({ path: 'userId', select: 'name username email phone' })
        .populate({ path: 'unitId', select: 'unitNumber blockOrBuilding' })
        .sort({ acknowledgedAt: -1 })
        .skip(skip)
        .limit(limit)
        .session(session || null),
      NoticeAcknowledgement.countDocuments(query).session(session || null),
    ]);

    return { data, total };
  }
}

export default new NoticeAcknowledgementRepository();
