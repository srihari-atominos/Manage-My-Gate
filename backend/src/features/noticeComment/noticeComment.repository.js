import NoticeComment from './noticeComment.model.js';

export class NoticeCommentRepository {
  async create(data, session = null) {
    const doc = new NoticeComment(data);
    return await doc.save(session ? { session } : undefined);
  }

  async findByNotice(noticeId, orgId, session = null) {
    return await NoticeComment.find({ noticeId, orgId, status: { $ne: 'Deleted' } })
      .populate({
        path: 'userId',
        select: 'name username email avatar roles residencyType',
        populate: { path: 'roles', select: 'name' },
      })
      .sort({ createdAt: 1 })
      .session(session || null);
  }

  async findById(id, orgId, session = null) {
    return await NoticeComment.findOne({ _id: id, orgId }).session(session || null);
  }

  async updateStatus(id, orgId, status, session = null) {
    return await NoticeComment.findOneAndUpdate(
      { _id: id, orgId },
      { status },
      { returnDocument: 'after', runValidators: true, session: session || null }
    );
  }

  async countByNotice(noticeId, orgId, session = null) {
    return await NoticeComment.countDocuments({
      noticeId,
      orgId,
      status: 'Active',
    }).session(session || null);
  }
}

export default new NoticeCommentRepository();
