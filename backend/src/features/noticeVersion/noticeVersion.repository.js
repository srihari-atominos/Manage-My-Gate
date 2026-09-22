import NoticeVersion from './noticeVersion.model.js';

export class NoticeVersionRepository {
  async create(data, session = null) {
    const doc = new NoticeVersion(data);
    return await doc.save(session ? { session } : undefined);
  }

  async findByNotice(noticeId, orgId, session = null) {
    return await NoticeVersion.find({ noticeId, orgId })
      .populate({ path: 'updatedBy', select: 'name username email' })
      .sort({ version: -1 })
      .session(session || null);
  }

  async findByNoticeAndVersion(noticeId, version, orgId, session = null) {
    return await NoticeVersion.findOne({ noticeId, version, orgId })
      .populate({ path: 'updatedBy', select: 'name username email' })
      .session(session || null);
  }

  async getLatestVersionNumber(noticeId, orgId, session = null) {
    const latest = await NoticeVersion.findOne({ noticeId, orgId })
      .sort({ version: -1 })
      .select('version')
      .session(session || null);
    return latest ? latest.version : 0;
  }
}

export default new NoticeVersionRepository();
